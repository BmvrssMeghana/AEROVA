# AEROVA

AEROVA is a construction-site environmental operations platform. This repository contains a React/Vite web application and a FastAPI service backed by PostgreSQL. It replaces the earlier single-user dashboard and in-memory Express telemetry sample with a tenant-scoped application foundation.

## Start locally with Docker

1. Copy `.env.example` to `.env` and replace the local database password and `AEROVA_SECRET_KEY`.
2. Run `docker compose up --build`.
3. Open [http://localhost:8080](http://localhost:8080). The API is at [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs).

The API container applies Alembic migrations before starting. PostgreSQL records and private uploads use named Docker volumes. Keep `.env` and production credentials out of source control. For production, set `AEROVA_ENV=production`, provide a managed database, HTTPS termination, a strong secret, private object storage and an explicit allowed-origin list.

## Run the app without Docker

For a simple local run without Docker or PostgreSQL, the API uses SQLite at `backend/aerova_dev.db`. PowerShell 5.1 commands for an existing checkout:

```powershell
# Terminal 1: backend
Set-Location "D:\Meghana Projects\AEROVA\AEROVA\backend"
$env:DATABASE_URL = "sqlite:///./aerova_dev.db"
$env:AEROVA_SECRET_KEY = "replace-with-a-long-local-secret"
$env:CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
.\.venv\Scripts\alembic.exe -c alembic.ini upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: frontend
Set-Location "D:\Meghana Projects\AEROVA\AEROVA"
npm run dev
```

If the virtual environment does not exist yet, run `py -m venv .venv` and `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` from the backend directory. If npm dependencies are missing, run `npm install` from the frontend directory. If port 8000 is already occupied, reuse the running service or stop its owning terminal with `Ctrl+C` before starting another backend. The API must be restarted after code changes; Vite refreshes the frontend during development.

The first AEROVA Admin is provisioned out of band from the backend directory after migrations:

```powershell
.\.venv\Scripts\python.exe scripts\create_platform_admin.py admin@example.com "AEROVA Admin"
```

The script prompts for a password. Sign in through the website, add customer businesses in the Admin console, and send the returned activation link to the invited manager. Customer Managers can create projects and invite Site Managers or Water Drivers. Email delivery is not configured in this local build, so invitation links are displayed in the application and can be copied to the invitee. Docker Compose remains the PostgreSQL-backed option when Docker Desktop is installed and running.

Set `DATABASE_URL` to a PostgreSQL URL when using PostgreSQL; Docker Compose configures that automatically.

Set `VITE_MAPBOX_TOKEN` to enable Mapbox GL for sites with configured coordinates. Without a token or georeference, the existing aerial reference image is shown as an explicitly illustrative, non-georeferenced view. Mapbox credentials are public browser credentials; restrict their scopes and allowed URLs in Mapbox.

## Product behavior and integration status

- Public marketing, sign-up/sign-in, organization/site setup, and the workspace modules follow the AEROVA SRS. Organization and site membership are enforced by the API for persisted resources.
- Site plans are stored under a private upload directory and served through authorized API routes. Do not expose this directory as a static web path.
- Telemetry uses provisioned device credentials, device-to-site/zone mapping, source and quality metadata, idempotency keys, and explicit missing/stale handling. Reports exclude simulation by default; reports are operational records, not regulatory certification.
- The Wokwi reference project is not remotely modified by this repository. Its current sketch emits legacy serial JSON with HTTP disabled. The device screen reports this honestly; no cloud telemetry is claimed until an authenticated transport and device provisioning are configured.
- Physical sensors, verified calibration, real forecast providers, email delivery, production map credentials, and signed/acknowledged hardware commands require external credentials or hardware. Interventions remain drafts unless an authorized approval and verified device transport are available. Site safety interlocks must remain local to the equipment.
- The public preview and explicit demo workspace contain illustrative simulation values. The production workspace does not silently substitute sample measurements when stored readings are absent.

## Main paths

- `src/` — React application and responsive visual system (Manrope, ivory/teal/coral).
- `backend/app/` — FastAPI routes, SQLAlchemy entities, authentication and authorization.
- `backend/app/migrations/` — Alembic migration environment and initial schema revision.
- `docker-compose.yml` — local PostgreSQL, API and web services.
- `public/site_aerial.jpg` — retained reference image from the earlier prototype.

## API

API routes are under `/api/v1`. OpenAPI docs are available at `/api/v1/docs` in development. `GET /api/v1/health` reports API and database status. Device provisioning displays a credential once; store it securely on the device. Never commit device tokens, signing keys or map tokens with write privileges.
