#!/usr/bin/env bash
set -euo pipefail

#############################################
# CONFIG (adjust if needed)
#############################################

REPO_DIR="/opt/lol-tracker/lol-tracker-gordos-frontend"
BRANCH="main"

# Validate something answers locally
LOCAL_HEALTHCHECK_URL="http://127.0.0.1:3000/"

# ✅ Correct PM2 process name (the one you had before)
PM2_NAME="lol-tracker-frontend"

# If a wrong process exists from prior runs, remove it
WRONG_PM2_NAME="lol-tracker-gordos-frontend"

# Environment files
BUILD_ENV_FILE="/etc/gordos-tracker-frontend.env"

# Mongo logging
MONGO_COLLECTION="${MONGO_COLLECTION:-frontend_releases_logs}"

#############################################
# INTERNAL PATHS
#############################################

LOCK_DIR="/opt/lol-tracker/locks"
LOCK_FILE="$LOCK_DIR/frontend-release.lock"
PID_FILE="$LOCK_DIR/frontend-release.pid"

LOCAL_LOG_DIR="/var/log/lol-tracker"
LOCAL_LOG_FILE="$LOCAL_LOG_DIR/frontend-release.log"

#############################################
# UTILITIES
#############################################

now_iso() { date -Is; }
MONGO_WARNED_MONGOSH=0
MONGO_WARNED_ENV=0
MONGO_WARNED_INSERT=0

make_correlation_id() {
  local sha="${COMMIT_SHA:-manual}"
  echo "${sha:0:12}-$(date +%s)-$$"
}

json_escape() {
  python3 - <<'PY'
import json, sys
s = sys.stdin.read()
print(json.dumps(s)[1:-1])
PY
}

log_local() {
  local level="$1"; shift
  local msg="$*"
  mkdir -p "$LOCAL_LOG_DIR"
  echo "$(now_iso) [$level] correlation_id=${CORRELATION_ID:-n/a} commit_sha=${COMMIT_SHA:-} msg=$(printf "%s" "$msg")" | tee -a "$LOCAL_LOG_FILE"
}

log_mongo() {
  local level="$1"; shift
  local step="$1"; shift
  local message="$1"; shift
  local meta="${1:-{}}"
  local auth_source
  auth_source="${MONGO_AUTH_SOURCE:-${MONGO_DATABASE:-}}"

  if ! command -v mongosh >/dev/null 2>&1; then
    if [[ "$MONGO_WARNED_MONGOSH" -eq 0 ]]; then
      log_local "WARN" "Mongo logging skipped: mongosh not installed"
      MONGO_WARNED_MONGOSH=1
    fi
    return 0
  fi
  if [[ -z "${MONGO_HOST:-}" || -z "${MONGO_PORT:-}" || -z "${MONGO_USERNAME:-}" || -z "${MONGO_PASSWORD:-}" || -z "${MONGO_DATABASE:-}" ]]; then
    if [[ "$MONGO_WARNED_ENV" -eq 0 ]]; then
      log_local "WARN" "Mongo logging skipped: missing one or more vars (MONGO_HOST/MONGO_PORT/MONGO_USERNAME/MONGO_PASSWORD/MONGO_DATABASE)"
      MONGO_WARNED_ENV=1
    fi
    return 0
  fi

  local ts; ts="$(now_iso)"

  local commit_msg="${COMMIT_MSG:-}"
  local commit_sha="${COMMIT_SHA:-}"

  local esc_message esc_step esc_level esc_corr esc_sha esc_cmsg
  esc_message="$(printf "%s" "$message" | json_escape)"
  esc_step="$(printf "%s" "$step" | json_escape)"
  esc_level="$(printf "%s" "$level" | json_escape)"
  esc_corr="$(printf "%s" "$CORRELATION_ID" | json_escape)"
  esc_sha="$(printf "%s" "$commit_sha" | json_escape)"
  esc_cmsg="$(printf "%s" "$commit_msg" | json_escape)"

  local mongo_out
  if ! mongo_out="$(mongosh \
    --host "$MONGO_HOST" \
    --port "$MONGO_PORT" \
    --username "$MONGO_USERNAME" \
    --password "$MONGO_PASSWORD" \
    --authenticationDatabase "$auth_source" \
    "$MONGO_DATABASE" \
    --quiet --eval "
    const dbname = '${MONGO_DATABASE}';
    const col = '${MONGO_COLLECTION}';
    const doc = {
      timestamp: new Date('${ts}'),
      correlation_id: \"${esc_corr}\",
      commit_sha: \"${esc_sha}\",
      commit_msg: \"${esc_cmsg}\",
      level: \"${esc_level}\",
      step: \"${esc_step}\",
      message: \"${esc_message}\",
      meta: ${meta}
    };
    db.getSiblingDB(dbname).getCollection(col).insertOne(doc);
  " 2>&1)"; then
    if [[ "$MONGO_WARNED_INSERT" -eq 0 ]]; then
      log_local "WARN" "Mongo insert failed db=${MONGO_DATABASE} col=${MONGO_COLLECTION} authSource=${auth_source} host=${MONGO_HOST}:${MONGO_PORT} error=$(printf "%s" "$mongo_out")"
      MONGO_WARNED_INSERT=1
    fi
    return 0
  fi
}

fail() {
  local step="$1"; shift
  local msg="$*"
  log_local "ERROR" "FAILED at ${step}: ${msg}"
  log_mongo "error" "$step" "FAILED: $msg" "{}"
  exit 1
}

run_step() {
  local step_num="$1"; shift
  local step_name="$1"; shift

  log_local "INFO" "==> [$step_num] $step_name"
  log_mongo "info" "$step_name" "START" "{\"step_num\": $step_num}"

  if ! "$@"; then
    fail "$step_name" "Command failed"
  fi

  log_mongo "info" "$step_name" "SUCCESS" "{\"step_num\": $step_num}"
}

#############################################
# CONCURRENCY + CANCELLATION
#############################################

ensure_lock_dir() {
  mkdir -p "$LOCK_DIR"
  chmod 755 "$LOCK_DIR"
}

cancel_previous_if_running() {
  if [[ -f "$PID_FILE" ]]; then
    local oldpid
    oldpid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$oldpid" ]] && kill -0 "$oldpid" >/dev/null 2>&1; then
      log_local "WARN" "Previous deploy PID $oldpid running. Cancelling (SIGTERM)..."
      log_mongo "warn" "concurrency" "Cancelling previous deploy" "{\"old_pid\": $oldpid}"
      kill -TERM "$oldpid" >/dev/null 2>&1 || true

      for i in {1..20}; do
        if kill -0 "$oldpid" >/dev/null 2>&1; then sleep 1; else break; fi
      done

      if kill -0 "$oldpid" >/dev/null 2>&1; then
        log_local "WARN" "Previous deploy PID $oldpid still running. Forcing (SIGKILL)..."
        kill -KILL "$oldpid" >/dev/null 2>&1 || true
      fi
    fi
  fi
}

acquire_lock_or_exit() {
  exec 200>"$LOCK_FILE"
  if ! flock -n 200; then
    log_local "WARN" "Another deploy holds lock. Exiting."
    log_mongo "warn" "concurrency" "Lock held; exiting" "{}"
    exit 0
  fi

  echo "$$" > "$PID_FILE"
  log_local "INFO" "Lock acquired. pid=$$"
  log_mongo "info" "concurrency" "Lock acquired" "{\"pid\": $$}"
}

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ "$pid" == "$$" ]]; then rm -f "$PID_FILE" || true; fi
  fi
}
trap cleanup EXIT

resolve_pm2_home() {
  local current_user current_home
  current_user="$(id -un)"
  current_home=""

  if command -v getent >/dev/null 2>&1; then
    current_home="$(getent passwd "$current_user" | cut -d: -f6 || true)"
  fi

  if [[ -z "$current_home" ]]; then
    current_home="$(eval echo "~$current_user" 2>/dev/null || true)"
  fi

  if [[ -z "$current_home" ]]; then
    current_home="${HOME:-}"
  fi

  if [[ -n "$current_home" ]]; then
    export HOME="$current_home"
    export PM2_HOME="$current_home/.pm2"
  fi
}

resolve_runtime_path() {
  local current_home
  current_home="${HOME:-}"

  if [[ -n "$current_home" ]]; then
    export PATH="$current_home/.npm-global/bin:$current_home/.local/bin:$PATH"
  fi
}

resolve_pm2_bin() {
  local current_user candidate
  current_user="$(id -un)"

  if command -v pm2 >/dev/null 2>&1; then
    PM2_BIN="$(command -v pm2)"
    export PM2_BIN
    return 0
  fi

  for candidate in \
    "${HOME:-}/.npm-global/bin/pm2" \
    "/home/$current_user/.npm-global/bin/pm2" \
    "/usr/local/bin/pm2" \
    "/usr/bin/pm2"
  do
    if [[ -x "$candidate" ]]; then
      PM2_BIN="$candidate"
      export PM2_BIN
      return 0
    fi
  done

  return 1
}

#############################################
# MAIN
#############################################

cd "$REPO_DIR"

# Ensure these are always defined even if the caller did not export them.
: "${COMMIT_SHA:=manual}"
: "${COMMIT_MSG:=manual trigger}"

# Load runtime env early so Mongo logging works for the entire run.
if [[ -f "$BUILD_ENV_FILE" ]]; then
  set -a
  source "$BUILD_ENV_FILE"
  set +a
fi

CORRELATION_ID="$(make_correlation_id)"

log_local "INFO" "New release commit received: sha=${COMMIT_SHA:-unknown} msg=${COMMIT_MSG:-unknown}"
log_local "INFO" "Mongo target: host=${MONGO_HOST:-unset}:${MONGO_PORT:-unset} db=${MONGO_DATABASE:-unset} col=${MONGO_COLLECTION} authSource=${MONGO_AUTH_SOURCE:-${MONGO_DATABASE:-unset}}"
log_mongo "info" "hook" "New commit received" "{\"sha\":\"${COMMIT_SHA:-}\",\"msg\":\"${COMMIT_MSG:-}\"}"

ensure_lock_dir
cancel_previous_if_running
acquire_lock_or_exit

# Step [1/7] Git pull
run_step "1/7" "git_pull" bash -lc "
  cd '$REPO_DIR' &&
  git fetch --all --prune &&
  git checkout '$BRANCH' &&
  git reset --hard 'origin/$BRANCH'
"

# Step [2/7] Load env for build-time NEXT_PUBLIC_* (optional)
run_step "2/7" "load_build_env" bash -lc "
  if [[ -f '$BUILD_ENV_FILE' ]]; then
    echo 'Build env file found: $BUILD_ENV_FILE'
  else
    echo 'No build env file found; continuing'
  fi
"

# Step [3/7] Install deps
run_step "3/7" "install_deps" bash -lc "
  cd '$REPO_DIR' &&
  corepack enable >/dev/null 2>&1 || true
  pnpm install --frozen-lockfile
"

# Step [4/7] Build
run_step "4/7" "build" bash -lc "
  cd '$REPO_DIR' &&
  if [[ -f '$BUILD_ENV_FILE' ]]; then
    set -a
    source '$BUILD_ENV_FILE'
    set +a
  fi
  pnpm run build
"

resolve_pm2_home
resolve_runtime_path
if ! resolve_pm2_bin; then
  fail "pm2_init" "pm2 binary not found. Expected one of: \$HOME/.npm-global/bin/pm2, /usr/local/bin/pm2, /usr/bin/pm2"
fi
log_local "INFO" "PM2 context resolved: user=$(id -un) HOME=${HOME:-} PM2_HOME=${PM2_HOME:-}"
log_local "INFO" "Runtime PATH=$PATH"
log_local "INFO" "PM2 binary resolved: $PM2_BIN"

# ✅ Step [5/7] Restart existing PM2 app (and remove wrong one if present)
run_step "5/7" "pm2_restart" bash -lc "
  echo 'PM2 debug:'
  echo \"  user=\$(id -un)\"
  echo \"  HOME=\${HOME:-}\"
  echo \"  PM2_HOME=\${PM2_HOME:-}\"
  echo \"  PATH=\${PATH:-}\"
  echo \"  PM2_BIN=$PM2_BIN\"

  if [[ ! -x '$PM2_BIN' ]]; then
    echo 'pm2 binary path is not executable: $PM2_BIN'
    exit 1
  fi

  # If the wrong process exists (created by earlier script), remove it to avoid confusion.
  if '$PM2_BIN' describe '$WRONG_PM2_NAME' >/dev/null 2>&1; then
    '$PM2_BIN' delete '$WRONG_PM2_NAME'
  fi

  if '$PM2_BIN' describe '$PM2_NAME' >/dev/null 2>&1; then
    '$PM2_BIN' restart '$PM2_NAME'
  else
    echo 'Expected PM2 process not found: $PM2_NAME'
    echo 'Current PM2 process list:'
    '$PM2_BIN' list || true
    echo 'Refusing to create a new PM2 process automatically to avoid name drift.'
    exit 1
  fi
"

# Step [6/7] Save PM2 state
run_step "6/7" "pm2_save" bash -lc "'$PM2_BIN' save"

# Step [7/7] Validation
run_step "7/7" "validate" bash -lc "
  set -e
  for i in {1..30}; do
    if curl -fsS -I '$LOCAL_HEALTHCHECK_URL' >/dev/null 2>&1; then
      exit 0
    fi
    sleep 1
  done
  echo 'Healthcheck failed'
  exit 1
"

log_local "INFO" "✅ Release finished successfully."
log_mongo "info" "done" "Release finished successfully" "{}"
