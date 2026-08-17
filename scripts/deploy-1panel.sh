#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${SOURCE_DIR:-/opt/1panel/apps/new-api-source}"
APP_DIR="${APP_DIR:-/opt/1panel/apps/new-api/new-api}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_DIR}/docker-compose.yml}"
BRANCH="${BRANCH:-main}"
SERVICE_NAME="${SERVICE_NAME:-new-api}"
CONTAINER_NAME="${CONTAINER_NAME:-1Panel-new-api-ljkr}"
IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-new-api-custom}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
BACKUP_DIR="${BACKUP_DIR:-${APP_DIR}/deploy-backups}"
LOCK_FILE="${LOCK_FILE:-/tmp/new-api-deploy.lock}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

for command in docker git flock sed grep; do
  command -v "$command" >/dev/null 2>&1 || fail "required command not found: ${command}"
done

[[ -d "${SOURCE_DIR}/.git" ]] || fail "source repository not found: ${SOURCE_DIR}"
[[ -f "$COMPOSE_FILE" ]] || fail "compose file not found: ${COMPOSE_FILE}"
[[ "$HEALTH_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || fail "HEALTH_TIMEOUT must be a positive integer"

if [[ "${DEPLOY_LOCK_HELD:-0}" != "1" ]]; then
  exec 9>"$LOCK_FILE"
  flock -n 9 || fail "another deployment is already running"
fi

cd "$SOURCE_DIR"
if ! git diff --quiet || ! git diff --cached --quiet; then
  fail "tracked source changes detected; commit or discard them before deploying"
fi

log "fetching origin/${BRANCH}"
git fetch origin "$BRANCH"
if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  git checkout "$BRANCH"
fi
git merge --ff-only "origin/${BRANCH}"

# Continue with the newly pulled version of this script.
if [[ "${DEPLOY_SCRIPT_REEXEC:-0}" != "1" ]]; then
  exec env DEPLOY_SCRIPT_REEXEC=1 \
    DEPLOY_LOCK_HELD=1 \
    SOURCE_DIR="$SOURCE_DIR" \
    APP_DIR="$APP_DIR" \
    COMPOSE_FILE="$COMPOSE_FILE" \
    BRANCH="$BRANCH" \
    SERVICE_NAME="$SERVICE_NAME" \
    CONTAINER_NAME="$CONTAINER_NAME" \
    IMAGE_REPOSITORY="$IMAGE_REPOSITORY" \
    HEALTH_TIMEOUT="$HEALTH_TIMEOUT" \
    BACKUP_DIR="$BACKUP_DIR" \
    LOCK_FILE="$LOCK_FILE" \
    bash "${SOURCE_DIR}/scripts/deploy-1panel.sh"
fi

COMMIT="$(git rev-parse --short=8 HEAD)"
IMAGE="${IMAGE_REPOSITORY}:${COMMIT}"
RUNNING_IMAGE="$(docker inspect "$CONTAINER_NAME" --format '{{.Config.Image}}' 2>/dev/null || true)"
RUNNING_STATE="$(docker inspect "$CONTAINER_NAME" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"

if [[ "$RUNNING_IMAGE" == "$IMAGE" && "$RUNNING_STATE" == "healthy" ]] &&
  grep -Fq "image: ${IMAGE}" "$COMPOSE_FILE"; then
  log "${IMAGE} is already running; nothing to deploy"
  exit 0
fi

log "building ${IMAGE}"
docker build --rm -t "$IMAGE" "$SOURCE_DIR"

mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/docker-compose.yml.${TIMESTAMP}.bak"
cp "$COMPOSE_FILE" "$BACKUP_FILE"
log "compose backup created: ${BACKUP_FILE}"

if ! grep -Eq 'image:[[:space:]]*(calciumion/new-api|new-api-custom):' "$COMPOSE_FILE"; then
  fail "new-api image entry was not found in ${COMPOSE_FILE}"
fi

if ! sed -i -E \
  "s#(image:[[:space:]]*)(calciumion/new-api|new-api-custom):[^[:space:]\"']+#\\1${IMAGE}#" \
  "$COMPOSE_FILE"; then
  cp "$BACKUP_FILE" "$COMPOSE_FILE"
  fail "failed to edit the compose image; original file restored"
fi

grep -Fq "image: ${IMAGE}" "$COMPOSE_FILE" || {
  cp "$BACKUP_FILE" "$COMPOSE_FILE"
  fail "failed to update the compose image"
}

rollback() {
  log "deployment failed; restoring ${BACKUP_FILE}"
  cp "$BACKUP_FILE" "$COMPOSE_FILE"
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate "$SERVICE_NAME" || true
  docker logs --tail=100 "$CONTAINER_NAME" 2>&1 || true
  fail "rollback completed; inspect the logs above"
}

cd "$APP_DIR"
if ! docker compose -f "$COMPOSE_FILE" config >/dev/null; then
  cp "$BACKUP_FILE" "$COMPOSE_FILE"
  fail "compose validation failed; original file restored"
fi

log "recreating service ${SERVICE_NAME}"
if ! docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate "$SERVICE_NAME"; then
  rollback
fi

log "waiting up to ${HEALTH_TIMEOUT}s for ${CONTAINER_NAME}"
DEADLINE=$((SECONDS + HEALTH_TIMEOUT))
while ((SECONDS < DEADLINE)); do
  STATE="$(docker inspect "$CONTAINER_NAME" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [[ "$STATE" == "healthy" ]]; then
    break
  fi
  if [[ "$STATE" == "running" ]] && docker exec "$CONTAINER_NAME" \
    wget -qO- http://localhost:3000/api/status 2>/dev/null | \
    grep -Eq '"success"[[:space:]]*:[[:space:]]*true'; then
    break
  fi
  if [[ "$STATE" == "unhealthy" || "$STATE" == "exited" || "$STATE" == "dead" ]]; then
    rollback
  fi
  sleep 5
done

STATE="$(docker inspect "$CONTAINER_NAME" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
if [[ "$STATE" != "healthy" ]]; then
  if ! docker exec "$CONTAINER_NAME" wget -qO- http://localhost:3000/api/status 2>/dev/null | \
    grep -Eq '"success"[[:space:]]*:[[:space:]]*true'; then
    rollback
  fi
fi

RUNNING_IMAGE="$(docker inspect "$CONTAINER_NAME" --format '{{.Config.Image}}')"
[[ "$RUNNING_IMAGE" == "$IMAGE" ]] || rollback

ls -1t "${BACKUP_DIR}"/docker-compose.yml.*.bak 2>/dev/null | tail -n +11 | xargs -r rm --

log "deployment succeeded"
log "commit: ${COMMIT}"
log "image: ${RUNNING_IMAGE}"
log "rollback compose: ${BACKUP_FILE}"
