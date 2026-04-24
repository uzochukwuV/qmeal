#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
MONGO_DATA_DIR="${MONGO_DATA_DIR:-$ROOT_DIR/.mongodb-data}"
mkdir -p "$LOG_DIR" "$MONGO_DATA_DIR"

cleanup() {
  echo "[start.sh] Shutting down..."
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [[ -n "${MONGO_PID:-}" ]]; then kill "$MONGO_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

# 1) MongoDB
if ! pgrep -f "mongod --dbpath $MONGO_DATA_DIR" > /dev/null 2>&1; then
  echo "[start.sh] Starting MongoDB on 127.0.0.1:27017..."
  mongod --dbpath "$MONGO_DATA_DIR" --bind_ip 127.0.0.1 --port 27017 \
    --logpath "$LOG_DIR/mongod.log" --fork --quiet > /dev/null
fi
MONGO_PID=$(pgrep -f "mongod --dbpath $MONGO_DATA_DIR" | head -n1)
echo "[start.sh] MongoDB pid=$MONGO_PID"

# 2) Backend (FastAPI on 127.0.0.1:8001)
echo "[start.sh] Starting FastAPI backend on 127.0.0.1:8001..."
cd "$ROOT_DIR/backend"
python -m uvicorn server:app --host 127.0.0.1 --port 8001 \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
cd "$ROOT_DIR"
echo "[start.sh] Backend pid=$BACKEND_PID"

# Wait briefly for backend to come up
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:8001/api/ > /dev/null 2>&1 \
     || curl -fsS http://127.0.0.1:8001/docs > /dev/null 2>&1; then
    echo "[start.sh] Backend ready."
    break
  fi
  sleep 1
done

# 3) Frontend (Expo Web on 0.0.0.0:5000)
echo "[start.sh] Starting Expo Web on 0.0.0.0:5000..."
cd "$ROOT_DIR/frontend"
export EXPO_NO_TELEMETRY=1
exec npx expo start --web --port 5000 --host lan
