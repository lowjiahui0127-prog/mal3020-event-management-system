#!/usr/bin/env bash
# Rollover test: replace the running backend with a new version while requests keep
# flowing, then roll back. Fails if even one request fails.
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash on Windows must not rewrite /etc/... into C:/Program Files/Git/etc/...
cd "$(dirname "$0")/.."

# A separate project, ports and passwords: never touches your development data
export COMPOSE_PROJECT_NAME=eventhub-rt
export COMPOSE_PROFILES=green
export HTTP_PORT=18080
export MONGO_HOST_PORT=27099
export MONGO_ROOT_USERNAME=admin
export MONGO_ROOT_PASSWORD=rollover_test
export JWT_SECRET=rollover-test-secret-not-for-production

IMAGE=eventhub-backend:local
REQUEST_LOG="$(mktemp)"
STOP_FLAG="$(mktemp -u)"

log() { printf '\n==> %s\n' "$*"; }

health() { docker compose exec -T frontend wget -qO- http://127.0.0.1:8080/api/health; }

expect_version() {
  local want="$1" body
  body="$(health)"
  echo "$body"
  grep -q "\"version\":\"$want\"" <<<"$body" || { echo "Expected version $want" >&2; exit 1; }
}

cleanup() {
  touch "$STOP_FLAG"
  docker rm -f ws-probe >/dev/null 2>&1 || true
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "1. Build the images and start the stack: backend-blue (version 1.0.0) behind nginx"
docker compose build backend-blue frontend
BACKEND_BLUE_VERSION=1.0.0 docker compose up -d --wait mongodb backend-blue frontend
expect_version 1.0.0

log "2. Open a WebSocket through the proxy"
docker run -d --name ws-probe --network "${COMPOSE_PROJECT_NAME}_default" \
  -e TARGET=ws://frontend:8080/ws "$IMAGE" node src/scripts/ws-probe.js >/dev/null

connected=no
for _ in $(seq 1 20); do
  logs="$(docker logs ws-probe 2>&1 || true)"
  if grep -q 'open #1' <<<"$logs"; then connected=yes; break; fi
  sleep 1
done
[ "$connected" = yes ] || { echo "The WebSocket did not connect" >&2; exit 1; }

log "3. Send a request every 100 ms from now on"
(
  while [ ! -e "$STOP_FLAG" ]; do
    curl -s -o /dev/null -w '%{http_code}\n' --max-time 3 \
      "http://localhost:${HTTP_PORT}/api/events" >> "$REQUEST_LOG" || echo 000 >> "$REQUEST_LOG"
    sleep 0.1
  done
) &

sleep 1

log "4. Deploy version 2.0.0 next to the old one, switch, drain, retire the old one"
bash scripts/deploy.sh "$IMAGE" 2.0.0
expect_version 2.0.0

log "5. The WebSocket client must have been told to reconnect (1001) and then reconnected"
exit_code="$(timeout 60 docker wait ws-probe)"
logs="$(docker logs ws-probe 2>&1)"
echo "$logs"
[ "$exit_code" = 0 ] || { echo "The WebSocket probe did not finish cleanly" >&2; exit 1; }
grep -q 'close 1001' <<<"$logs" || { echo "Expected close code 1001" >&2; exit 1; }
grep -q 'reconnected' <<<"$logs" || { echo "The client did not reconnect" >&2; exit 1; }

log "6. Roll back to version 1.0.0"
bash scripts/deploy.sh rollback
expect_version 1.0.0

log "7. Count the failed requests"
touch "$STOP_FLAG"
wait

total="$(wc -l < "$REQUEST_LOG" | tr -d ' ')"
failed="$(grep -vc '^200$' "$REQUEST_LOG" || true)"
echo "Requests sent: $total, failed: $failed"

[ "$total" -ge 30 ] || { echo "Too few requests were sent to prove anything" >&2; exit 1; }

if [ "$failed" -ne 0 ]; then
  echo "Some requests failed during the rollover:" >&2
  sort "$REQUEST_LOG" | uniq -c >&2
  exit 1
fi

log "PASSED: zero failed requests, WebSocket reconnected, rollback works"