#!/usr/bin/env bash
# Blue-green rollover of the backend.
#
#   bash scripts/deploy.sh <backend-image> [version]
#       start the new version beside the old one, check it, switch traffic,
#       let running requests finish, then stop the old one
#
#   bash scripts/deploy.sh rollback
#       switch back to the previous version (kept stopped, ready to start)
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."

export COMPOSE_PROFILES=green   # makes the "green" service visible to every command below

UPSTREAM_FILE=/etc/nginx/active/backend-upstream.conf
DRAIN_SECONDS="${DRAIN_SECONDS:-5}"
STOP_TIMEOUT="${STOP_TIMEOUT:-30}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-90}"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Which colour is serving users right now? (read from the nginx upstream file)
active_color() {
  docker compose exec -T frontend cat "$UPSTREAM_FILE" \
    | grep -o 'backend-\(blue\|green\)' | head -n1 | sed 's/backend-//'
}

other_color() { if [ "$1" = blue ]; then echo green; else echo blue; fi; }

wait_healthy() {
  local service="$1" id status i
  id="$(docker compose ps -q "$service")"
  [ -n "$id" ] || fail "no container found for $service"

  for ((i = 0; i < HEALTH_TIMEOUT; i++)); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$id")"
    [ "$status" = healthy ] && return 0
    sleep 1
  done

  return 1
}

# Rewrite the upstream and reload nginx. Reload is graceful: requests already
# being handled finish on the old backend, new requests go to the new one.
point_proxy_to() {
  local color="$1"

  printf 'upstream backend_active {\n    server backend-%s:3000;\n    keepalive 16;\n}\n' "$color" \
    | docker compose exec -T frontend sh -c "cat > $UPSTREAM_FILE"

  docker compose exec -T frontend nginx -t
  docker compose exec -T frontend nginx -s reload
}

# Ask /api/health (through nginx) which version is answering
verify_through_proxy() {
  local version="$1" body i

  for i in 1 2 3 4 5; do
    body="$(docker compose exec -T frontend wget -qO- http://127.0.0.1:8080/api/health 2>/dev/null || true)"
    if grep -q "\"version\":\"$version\"" <<<"$body"; then
      return 0
    fi
    sleep 1
  done

  return 1
}

deploy() {
  local image="$1" version="${2:-$(date +%Y%m%d-%H%M%S)}"
  local active idle upper direct

  active="$(active_color)"
  idle="$(other_color "$active")"
  upper="$(printf '%s' "$idle" | tr '[:lower:]' '[:upper:]')"

  log "Live now: $active. Starting $idle with $image (version $version)"

  docker image inspect "$image" >/dev/null 2>&1 || docker pull "$image"

  export "BACKEND_${upper}_IMAGE=$image" "BACKEND_${upper}_VERSION=$version"
  docker compose up -d --no-deps --force-recreate "backend-$idle"

  # 1. The new version must be healthy and report the expected version
  if ! wait_healthy "backend-$idle"; then
    docker compose logs --tail 50 "backend-$idle" || true
    docker compose stop "backend-$idle" || true
    fail "$idle never became healthy. Nothing changed: users are still on $active."
  fi

  direct="$(docker compose exec -T "backend-$idle" wget -qO- http://127.0.0.1:3000/api/health || true)"
  if ! grep -q "\"version\":\"$version\"" <<<"$direct"; then
    docker compose stop "backend-$idle" || true
    fail "$idle reports the wrong version. Nothing changed: users are still on $active."
  fi

  # 2. Switch traffic. Old and new run side by side during the switch.
  log "Switching traffic: $active -> $idle"
  point_proxy_to "$idle"

  if ! verify_through_proxy "$version"; then
    log "The new version failed the check through the proxy: switching back"
    point_proxy_to "$active"
    docker compose stop "backend-$idle" || true
    fail "Rolled back to $active."
  fi

  # 3. Let requests that are still running on the old backend finish, then retire it
  log "Waiting ${DRAIN_SECONDS}s for running requests on $active to finish"
  sleep "$DRAIN_SECONDS"

  log "Stopping $active gracefully (SIGTERM, up to ${STOP_TIMEOUT}s)"
  docker compose stop -t "$STOP_TIMEOUT" "backend-$active"

  log "Done. $idle is live (version $version). $active is stopped but kept for rollback."
}

rollback() {
  local active previous

  active="$(active_color)"
  previous="$(other_color "$active")"

  [ -n "$(docker compose ps -a -q "backend-$previous")" ] || fail "nothing to roll back to"

  log "Rolling back: $active -> $previous"
  docker compose start "backend-$previous"

  wait_healthy "backend-$previous" || fail "$previous did not become healthy; staying on $active"

  point_proxy_to "$previous"

  sleep "$DRAIN_SECONDS"
  docker compose stop -t "$STOP_TIMEOUT" "backend-$active"

  log "Done. $previous is live again."
}

case "${1:-}" in
  "")       fail "usage: scripts/deploy.sh <backend-image> [version]  |  scripts/deploy.sh rollback" ;;
  rollback) rollback ;;
  *)        deploy "$@" ;;
esac