# AEROVA implementation status

Updated 2026-11-13. Requirements were taken from `AEROVA_Final_SRS_v1_1.docx`; the document is product input, not a set of instructions to the coding agent.

## Implemented in this repository

- A responsive Manrope-based public site, sign-up/sign-in, an 8-step site setup flow, and a 12-module workspace shell.
- A FastAPI service with PostgreSQL persistence, Alembic migration entry point, password hashing, short-lived signed access tokens, organization/site membership checks, device credentials, audit records, and tenant-scoped resources.
- Telemetry ingestion with source-type enforcement, provisioned site/zone mapping, idempotency checks, range validation, quality metadata, thresholds, and explicit missing/stale risk states.
- Site assets, zones, map configuration, alerts, intervention drafts, CSV operational reports, notifications, invitations, and public demo requests.
- Docker Compose for local PostgreSQL/API/web startup. The previous aerial reference remains available as an explicitly non-georeferenced visual fallback.
- A clearly labeled illustrative simulation workspace. Production dashboards do not default to sample measurements.

## Requires external setup or additional implementation

- The referenced Wokwi sketch is a remote reference and has not been modified. Its HTTP transport is disabled. Authenticated HTTPS/MQTT connectivity, canonical payload publishing, device provisioning on the UI, certificate management, and verified command acknowledgement still need an end-to-end hardware integration.
- Physical sensors, calibration records, a live forecast provider, email delivery, production Mapbox credentials, object storage, and production deployment secrets are not supplied here.
- Mapbox can render a base map when a restricted public token and site coordinates are provided. Boundary drawing, georeference control points, zone geometry editing, and measured/predicted overlays need to be completed before using the map as a field view.
- Some workspace modules are operational shells with persisted-data empty states; reporting and alert actions have API paths, while resource vendor workflow, workforce identity controls, and many settings still need their complete CRUD screens.
- The initial Alembic revision establishes the schema from SQLAlchemy metadata. Future schema changes should use reviewed, generated Alembic revisions rather than `create_all` in application startup.

## Local verification

- `python -m compileall backend/app` — passed.
- `npm run build` — passed. Vite warns that the lazy-loaded Mapbox chunk exceeds 500 kB; the rest of the frontend is split from that map dependency.
- `npm run lint` — passed with no diagnostics after the final UI changes.
- `npm install` reported two dependency advisories (one moderate, one high); review with `npm audit` before a production release.
