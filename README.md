# AEROVA

AEROVA is a construction-site environmental operations platform. This repository contains a React/Vite web application and a FastAPI service backed by PostgreSQL. It replaces the earlier single-user dashboard and in-memory Express telemetry sample with a tenant-scoped application foundation.

## Connect to the existing PostgreSQL database

Configure the backend to connect to database `aerova` and schema `aerova_website`. Copy `.env.example` to `.env`, set the database connection details and a strong `AEROVA_SECRET_KEY`, then start the API and frontend as described below. The application reads and writes the existing database; it does not create demo users or insert sample records.

The ORM targets `aerova_website`. Do not run Alembic migrations against the existing database: the historical migration revisions do not match its schema. The backend container starts the API without applying migrations. Keep `.env` and production credentials out of source control. For production, set `AEROVA_ENV=production`, provide a managed database, HTTPS termination, a strong secret, private object storage and an explicit allowed-origin list.

## Run the app without Docker

PowerShell 5.1 commands for an existing checkout:

```powershell
# Terminal 1: backend
Set-Location "D:\Meghana Projects\AEROVA\AEROVA\backend"
$env:DATABASE_URL = "postgresql+psycopg://<user>:<password>@localhost:5432/aerova"
$env:AEROVA_DB_SCHEMA = "aerova_website"
$env:AEROVA_SECRET_KEY = "replace-with-a-long-local-secret"
$env:CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: frontend
Set-Location "D:\Meghana Projects\AEROVA\AEROVA"
npm run dev
```

If the virtual environment does not exist yet, run `py -m venv .venv` and `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` from the backend directory. If npm dependencies are missing, run `npm install` from the frontend directory. If port 8000 is already occupied, reuse the running service or stop its owning terminal with `Ctrl+C` before starting another backend. The API must be restarted after code changes; Vite refreshes the frontend during development.

For Docker Compose, configure the same PostgreSQL credentials in `.env`, then run `docker compose up --build`. The API container connects to the host PostgreSQL service at `host.docker.internal`; it does not start a separate database or apply migrations. Open [http://localhost:8080](http://localhost:8080); the API is at [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs).

Sign-in and authorization use the role stored on each database user; accounts are not selected by fixed email addresses. If an existing account has no usable password hash, the local-only password utility can update that existing account without creating a user or changing its role:

```powershell
.\.venv\Scripts\python.exe scripts\set_existing_user_password.py user@example.com
```

The script prompts for the new password and requires that the email already exist in `aerova_website.users`.

For a local PostgreSQL server, set `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` in the root `.env` file. The backend reads that ignored file and uses `POSTGRES_HOST`/`POSTGRES_PORT` (defaulting to `localhost:5432`) when `DATABASE_URL` is not set. Never put database credentials in frontend settings or committed files.

In development, the API permits CORS requests from localhost and 127.0.0.1 on any port; production should use explicit `CORS_ORIGINS` instead.

## Product behavior and integration status

- Public marketing, sign-up/sign-in, organization/site setup, and the workspace modules follow the AEROVA SRS. Organization and site membership are enforced by the API for persisted resources.
- Site plans are stored under a private upload directory and served through authorized API routes. Do not expose this directory as a static web path.
- Telemetry uses provisioned device credentials, device-to-site/zone mapping, source and quality metadata, idempotency keys, and explicit missing/stale handling. Reports are operational records, not regulatory certification.
- The Wokwi reference project is not remotely modified by this repository. Its current sketch emits legacy serial JSON with HTTP disabled. The device screen reports this honestly; no cloud telemetry is claimed until an authenticated transport and device provisioning are configured.
- Physical sensors, verified calibration, real forecast providers, email delivery, and signed/acknowledged hardware commands require external credentials or hardware. Interventions remain drafts unless an authorized approval and verified device transport are available. Site safety interlocks must remain local to the equipment.
- Dashboards use persisted API data and show explicit empty states when records are absent; no in-memory sample telemetry is substituted.

## Main paths

- `src/` — React application and responsive visual system (Manrope, ivory/teal/coral).
- `backend/app/` — FastAPI routes, SQLAlchemy entities, authentication and authorization.
- `backend/app/migrations/` — historical Alembic revisions; do not apply them to the existing `aerova_website` schema until reviewed and aligned.
- `docker-compose.yml` — API and web services connected to the existing host PostgreSQL database.

## API

API routes are under `/api/v1`. OpenAPI docs are available at `/api/v1/docs` in development. `GET /api/v1/health` reports API and database status. Device provisioning displays a credential once; store it securely on the device. Never commit device tokens, signing keys or map tokens with write privileges.
