# Qmeal

Food-ordering app with role-based flows (customer, owner, rider, admin).

## Stack
az webapp config appsettings set --name qmean-backend --resource-group qmeal --settings MONGO_URL="mongodb+srv://vicezealor_db_user:bQHNL5fFkLKSgAxO@cluster0.ucm88sl.mongodb.net/?appName=Cluster0" JWT_SECRET="vicezealor_db_user_bQHNL5fFkLKSgAxO"

"mongodb+srv://vicezealor_db_user:bQHNL5fFkLKSgAxO@cluster0.ucm88sl.mongodb.net/?appName=Cluster0"
bQHNL5fFkLKSgAxO

vicezealor_db_user

mongodb+srv://vicezealor_db_user:bQHNL5fFkLKSgAxO@cluster0.ucm88sl.mongodb.net/?appName=Cluster0
- **Frontend:** Expo / React Native (web target via Metro). Lives in `frontend/`.
- **Backend:** FastAPI + Motor (async MongoDB driver). Lives in `backend/`.
- **Database:** MongoDB 7 (installed as a Nix system package).

## Running locally on Replit

A single workflow `Start application` runs three processes via `start.sh`:

1. `mongod` on `127.0.0.1:27017`, data in `./.mongodb-data` (logs in `./.logs/mongod.log`).
2. FastAPI (`uvicorn server:app`) on `127.0.0.1:8001` (logs in `./.logs/backend.log`).
3. Expo Web (Metro bundler) on `0.0.0.0:5000` — this is the port shown in the Replit preview iframe.

Metro proxies `/api/*` requests to the FastAPI backend (configured in
`frontend/metro.config.js` via `http-proxy-middleware`). This keeps the web
client on a single same-origin URL, which is required because Replit's
preview only exposes one port to the iframe.

## Environment variables

- `backend/.env` — `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, Stripe keys (currently
  mock keys for development).
- `frontend/.env` — `EXPO_PUBLIC_BACKEND_URL` is intentionally empty so axios
  uses same-origin `/api/...` URLs (proxied by Metro).

## Notable fixes applied during import

- Installed missing peer dep `react-native-worklets` (required by
  `react-native-reanimated`).
- Added `frontend/src/services/api.ts` and `frontend/src/context/AuthContext.ts`
  as compatibility wrappers re-exporting the canonical store/api client used by
  several admin/owner/rider screens.

## Deployment

Configured as a `vm` deployment (MongoDB needs a long-running process on the
same machine). The deployment runs `bash start.sh` which boots Mongo, the
FastAPI backend, and the Expo web dev server on port 5000.

For a production-grade setup, swap MongoDB for a hosted Mongo (e.g. Atlas) and
build/serve the Expo web bundle as static files; the current configuration is
optimized for "make it run on Replit".
