#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/lol-tracker/lol-tracker-gordos-frontend"
ENV_FILE="/etc/gordos-tracker-frontend.env"
PM2_NAME="lol-tracker-frontend"
PORT="${PORT:-3000}"

# Mongo config (local)
MONGO_DB="${MONGO_DB:-gordos_lol_tracker}"
MONGO_URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"
MONGO_COLLECTION="frontend_releases_logs"

# Concurrency lock (server-side)
LOCK_FILE="/var/lock/gordos-tracker-frontend-deploy.lock"

export PM2_HOME=/home/deploy/.pm2

COMMIT_SHA="${COMMIT_SHA:-unknown}"
COMMIT_MSG="${COMMIT_MSG:-unknown}"

# correlation_id: same for all logs in this deploy attempt
CORRELATION_ID="$(
  if command -v uuidgen >/dev/null 2>&1; then uuidgen
  else python3 - <<'PY'
import uuid; print(uuid.uuid4())
PY
  fi
)"

ts_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

mongo_log() {
  # mongo_log LEVEL STEP MESSAGE [extra_json]
  local level="$1"; shift
  local step="$1"; shift
  local message="$1"; shift
  local extra="${1:-{}}"

  # NOTE: we embed JSON carefully; keep message simple (no unescaped quotes).
  mongosh "$MONGO_URI/$MONGO_DB" --quiet --eval "
    db.getCollection('$MONGO_COLLECTION').insertOne({
      timestamp: new Date(),
      timestamp_iso: '$(ts_iso)',
      correlation_id: '$CORRELATION_ID',
      level: '$level',
      step: '$step',
      message: '$message',
      commit_sha: '$COMMIT_SHA',
      commit_message: '$COMMIT_MSG',
      extra: $extra
    })
  " >/dev/null 2>&1 || true
}

log_and_echo() {
  local level="$1"; shift
  local step="$1"; shift
  local message="$1"; shift
  echo "$message"
  mongo_log "$level" "$step" "$message"
}

fail() {
  local step="$1"; shift
  local message="$1"; shift
  echo "ERROR: $message" >&2
  mongo_log "error" "$step" "$message"
  exit 1
}

# Acquire lock (only 1 deploy at a time on server)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  # Another deploy is running. Since GitHub Actions cancels in-progress,
  # we just exit here and the newest run will retry by virtue of being the one that runs.
  fail "lock" "Another deploy is currently running; exiting to avoid concurrent deploys."
fi

# Trap errors to log them with step context
CURRENT_STEP="init"
trap 'mongo_log "error" "$CURRENT_STEP" "Deploy failed (trap)" "{ exit_code: $?, last_step: \"$CURRENT_STEP\" }"' ERR

log_and_echo "info" "commit" "New commit received \"$COMMIT_MSG\""

cd "$APP_DIR"

CURRENT_STEP="1/7_git_pull"
log_and_echo "info" "$CURRENT_STEP" "==> [1/7] Git pull"
git fetch --all --prune
git checkout main
git pull --ff-only origin main

CURRENT_STEP="2/7_load_env"
log_and_echo "info" "$CURRENT_STEP" "==> [2/7] Load env (for build-time NEXT_PUBLIC_*)"
set -a
source "$ENV_FILE"
set +a

CURRENT_STEP="3/7_install_deps"
log_and_echo "info" "$CURRENT_STEP" "==> [3/7] Install deps"
pnpm install --frozen-lockfile || pnpm install

CURRENT_STEP="4/7_build"
log_and_echo "info" "$CURRENT_STEP" "==> [4/7] Build"
pnpm build

CURRENT_STEP="5/7_pm2"
log_and_echo "info" "$CURRENT_STEP" "==> [5/7] Start or restart PM2"

chmod +x "$APP_DIR/start-prod.sh"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  PORT="$PORT" pm2 start "$APP_DIR/start-prod.sh" --name "$PM2_NAME" --cwd "$APP_DIR"
fi

CURRENT_STEP="6/7_pm2_save"
log_and_echo "info" "$CURRENT_STEP" "==> [6/7] Save PM2 state"
pm2 save

CURRENT_STEP="7/7_validation"
log_and_echo "info" "$CURRENT_STEP" "==> [7/7] Validation"

# Validation 1: process exists and online
STATUS="$(pm2 jlist | python3 - <<'PY'
import json,sys
apps=json.load(sys.stdin)
target='lol-tracker-frontend'
for a in apps:
  if a.get('name')==target:
    print(a.get('pm2_env',{}).get('status','unknown'))
    raise SystemExit(0)
print('missing')
PY
)"
if [ "$STATUS" != "online" ]; then
  fail "$CURRENT_STEP" "PM2 app status is '$STATUS' (expected online)"
fi

# Validation 2: local health check (port 3000)
HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/" || true)"
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "301" ] && [ "$HTTP_CODE" != "302" ]; then
  fail "$CURRENT_STEP" "HTTP check failed on 127.0.0.1:${PORT} (code=$HTTP_CODE)"
fi

mongo_log "info" "$CURRENT_STEP" "Validation passed" "{ pm2_status: \"$STATUS\", local_http_code: \"$HTTP_CODE\" }"
echo "*** Validation passed (pm2=$STATUS, http=$HTTP_CODE) ***"

mongo_log "info" "done" "Deploy completed successfully"
