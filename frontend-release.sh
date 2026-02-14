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
RUNTIME_ENV_FILE="/etc/lol-tracker-frontend.env"
BUILD_ENV_FILE="/etc/lol-tracker-frontend.build.env"

# Mongo logging
MONGO_AUTH_SOURCE="${MONGO_AUTH_SOURCE:-admin}"
MONGO_COLLECTION="frontend_releases_logs"

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
  echo "$(now_iso) [$level] correlation_id=$CORRELATION_ID commit_sha=${COMMIT_SHA:-} msg=$(printf "%s" "$msg")" | tee -a "$LOCAL_LOG_FILE" >/dev/null
}

log_mongo() {
  local level="$1"; shift
  local step="$1"; shift
  local message="$1"; shift
  local meta="${1:-{}}"

  if ! command -v mongosh >/dev/null 2>&1; then return 0; fi
  if [[ -z "${MONGO_HOST:-}" || -z "${MONGO_PORT:-}" || -z "${MONGODB_USERNAME:-}" || -z "${MONGODB_PASSWORD:-}" || -z "${MONGODB_DATABASE:-}" ]]; then
    return 0
  fi

  local uri="mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGODB_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"
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

  mongosh "$uri" --quiet --eval "
    const dbname = '${MONGODB_DATABASE}';
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
  " >/dev/null 2>&1 || true
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

#############################################
# MAIN
#############################################

cd "$REPO_DIR"

CORRELATION_ID="$(make_correlation_id)"

log_local "INFO" "New release commit received: sha=${COMMIT_SHA:-unknown} msg=${COMMIT_MSG:-unknown}"
log_mongo "info" "hook" "New commit received" "{\"sha\":\"${COMMIT_SHA:-}\",\"msg\":\"${COMMIT_MSG:-}\"}"

# Load runtime env (may include mongo vars)
if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RUNTIME_ENV_FILE"
  set +a
fi

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

# ✅ Step [5/7] Restart existing PM2 app (and remove wrong one if present)
run_step "5/7" "pm2_restart" bash -lc "
  # If the wrong process exists (created by earlier script), remove it to avoid confusion.
  if pm2 describe '$WRONG_PM2_NAME' >/dev/null 2>&1; then
    pm2 delete '$WRONG_PM2_NAME'
  fi

  if pm2 describe '$PM2_NAME' >/dev/null 2>&1; th_
