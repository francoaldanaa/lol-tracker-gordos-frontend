#!/usr/bin/env bash
set -euo pipefail

#############################################
# CONFIG (adjust these 3 values if needed)
#############################################

REPO_DIR="/opt/lol-tracker/lol-tracker-gordos-frontend"
BRANCH="main"

# Where your Next.js app runs locally (for validation)
LOCAL_HEALTHCHECK_URL="http://127.0.0.1:3000/"

# PM2 process name (must match your existing pm2 process)
PM2_NAME="lol-tracker-gordos-frontend"

# Environment file for runtime variables (NOT build-time NEXT_PUBLIC_*)
RUNTIME_ENV_FILE="/etc/lol-tracker-frontend.env"

# Optional: build-time env file (NEXT_PUBLIC_*). If you already have one, set it here.
BUILD_ENV_FILE="/etc/lol-tracker-frontend.build.env"

# Mongo configuration for logging (same vars you already use)
# Expected vars (exported in env files): MONGO_HOST, MONGO_PORT, MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_DATABASE
MONGO_AUTH_SOURCE="${MONGO_AUTH_SOURCE:-admin}"
MONGO_COLLECTION="frontend_releases_logs"

#############################################
# INTERNAL PATHS (do not change)
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

# Correlation ID: deterministic-ish per run, and unique
make_correlation_id() {
  # COMMIT_SHA might not exist in manual runs; handle it
  local sha="${COMMIT_SHA:-manual}"
  echo "${sha:0:12}-$(date +%s)-$$"
}

# Safe JSON string escaping for minimal needs (quotes/backslashes/newlines)
json_escape() {
  python3 - <<'PY'
import json, sys
s = sys.stdin.read()
print(json.dumps(s)[1:-1])
PY
}

# Write to local log always
log_local() {
  local level="$1"; shift
  local msg="$*"
  mkdir -p "$LOCAL_LOG_DIR"
  echo "$(now_iso) [$level] correlation_id=$CORRELATION_ID commit_sha=${COMMIT_SHA:-} msg=$(printf "%s" "$msg")" | tee -a "$LOCAL_LOG_FILE" >/dev/null
}

# Insert log entry into MongoDB (best-effort; never blocks deploy logging)
log_mongo() {
  local level="$1"; shift
  local step="$1"; shift
  local message="$1"; shift
  local meta="${1:-{}}"

  # Only attempt if mongosh exists
  if ! command -v mongosh >/dev/null 2>&1; then
    return 0
  fi

  # Only attempt if we have required env vars
  if [[ -z "${MONGO_HOST:-}" || -z "${MONGO_PORT:-}" || -z "${MONGODB_USERNAME:-}" || -z "${MONGODB_PASSWORD:-}" || -z "${MONGODB_DATABASE:-}" ]]; then
    return 0
  fi

  # Build a URI
  local uri="mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGODB_DATABASE}?authSource=${MONGO_AUTH_SOURCE}"

  # Compose safe JS
  local ts
  ts="$(now_iso)"
  local commit_msg="${COMMIT_MSG:-}"
  local commit_sha="${COMMIT_SHA:-}"

  # Escape strings for JS
  local esc_message esc_step esc_level esc_corr esc_sha esc_cmsg
  esc_message="$(printf "%s" "$message" | json_escape)"
  esc_step="$(printf "%s" "$step" | json_escape)"
  esc_level="$(printf "%s" "$level" | json_escape)"
  esc_corr="$(printf "%s" "$CORRELATION_ID" | json_escape)"
  esc_sha="$(printf "%s" "$commit_sha" | json_escape)"
  esc_cmsg="$(printf "%s" "$commit_msg" | json_escape)"

  # Best-effort insert (ignore failures)
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

  # Run command(s)
  if ! "$@"; then
    fail "$step_name" "Command failed"
  fi

  log_mongo "info" "$step_name" "SUCCESS" "{\"step_num\": $step_num}"
}

#############################################
# CONCURRENCY + CANCELLATION
#############################################

ensure_lock_dir() {
  sudo mkdir -p "$LOCK_DIR"
  sudo chown -R "$(whoami)":"$(whoami)" "$LOCK_DIR"
  sudo chmod 755 "$LOCK_DIR"
}

cancel_previous_if_running() {
  if [[ -f "$PID_FILE" ]]; then
    local oldpid
    oldpid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$oldpid" ]] && kill -0 "$oldpid" >/dev/null 2>&1; then
      log_local "WARN" "Previous deploy PID $oldpid is running. Cancelling it (SIGTERM)..."
      log_mongo "warn" "concurrency" "Cancelling previous deploy" "{\"old_pid\": $oldpid}"

      kill -TERM "$oldpid" >/dev/null 2>&1 || true

      # wait up to 20s for graceful exit
      for i in {1..20}; do
        if kill -0 "$oldpid" >/dev/null 2>&1; then
          sleep 1
        else
          break
        fi
      done

      if kill -0 "$oldpid" >/dev/null 2>&1; then
        log_local "WARN" "Previous deploy PID $oldpid did not stop, forcing (SIGKILL)..."
        kill -KILL "$oldpid" >/dev/null 2>&1 || true
      fi
    fi
  fi
}

acquire_lock_or_exit() {
  # Use flock on a file descriptor; non-blocking.
  exec 200>"$LOCK_FILE"
  if ! flock -n 200; then
    # Another deploy is holding the lock. We already tried to cancel old PID; if it's a different process, exit.
    log_local "WARN" "Another deploy holds lock. Exiting."
    log_mongo "warn" "concurrency" "Lock held by another process; exiting." "{}"
    exit 0
  fi

  echo "$$" > "$PID_FILE"
  log_local "INFO" "Lock acquired. pid=$$ lock_file=$LOCK_FILE"
  log_mongo "info" "concurrency" "Lock acquired" "{\"pid\": $$}"
}

cleanup() {
  # Release lock automatically when shell exits; just cleanup pid file if we own it.
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ "$pid" == "$$" ]]; then
      rm -f "$PID_FILE" || true
    fi
  fi
}
trap cleanup EXIT

#############################################
# MAIN
#############################################

cd "$REPO_DIR"

CORRELATION_ID="$(make_correlation_id)"

# Always log a first breadcrumb that does not depend on Mongo.
log_local "INFO" "New release commit received: sha=${COMMIT_SHA:-unknown} msg=${COMMIT_MSG:-unknown}"
log_mongo "info" "hook" "New commit received" "{\"sha\":\"${COMMIT_SHA:-}\",\"msg\":\"${COMMIT_MSG:-}\"}"

# Load env (if present). Runtime env may also include mongo vars for logging.
if [[ -f "$RUNTIME_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$RUNTIME_ENV_FILE"
  set +a
fi

# Ensure lock dir exists, cancel any previous, then acquire lock.
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
# If you rely on NEXT_PUBLIC_* at build time, we export them from BUILD_ENV_FILE if it exists.
run_step "4/7" "build" bash -lc "
  cd '$REPO_DIR' &&
  if [[ -f '$BUILD_ENV_FILE' ]]; then
    set -a
    source '$BUILD_ENV_FILE'
    set +a
  fi
  pnpm run build
"

# Step [5/7] Start or restart PM2
run_step "5/7" "pm2_restart" bash -lc "
  cd '$REPO_DIR' &&
  if pm2 describe '$PM2_NAME' >/dev/null 2>&1; then
    pm2 restart '$PM2_NAME'
  else
    # Adjust start command if yours differs
    pm2 start 'pnpm -- start' --name '$PM2_NAME'
  fi
"

# Step [6/7] Save PM2 state
run_step "6/7" "pm2_save" bash -lc "
  pm2 save
"

# Step [7/7] Validation
# Validate that something is actually responding on localhost.
run_step "7/7" "validate" bash -lc "
  set -e
  # Try up to ~30s
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
