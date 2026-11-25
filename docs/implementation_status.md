# AEROVA implementation status

Updated 2026-11-22. Requirements were taken from `AEROVA_Final_SRS_v1_1.docx` and the role-based implementation brief.

## Implemented in this repository

- A responsive Manrope-based public site, sign-up/sign-in, an 8-step site setup flow that persists organization, project, zones, thresholds, site plans, and team invitations, and distinct AEROVA Admin, Customer Manager, Site Manager, and Water Driver experiences.
- A FastAPI service with PostgreSQL persistence, Alembic migration entry point, password hashing, short-lived signed access tokens, organization/site membership checks, device credentials, audit records, and tenant-scoped resources.
- Telemetry ingestion with source-type enforcement, provisioned site/zone mapping, idempotency checks, range validation, quality metadata, thresholds, and explicit missing/stale risk states.
- Site assets, zones, map configuration, alerts, intervention drafts, CSV operational reports, notifications, invitations, and persisted public contact requests.
- The API targets the existing PostgreSQL `aerova` database and `aerova_website` schema. Role selection and resource data come from the database; no fixed demo-account generator or in-memory telemetry server is part of the application.
- Dashboards show persisted records and explicit empty states; they do not substitute sample measurements.

## Requires external setup or additional implementation

- The referenced Wokwi sketch is a remote reference and has not been modified. Its HTTP transport is disabled. Authenticated HTTPS/MQTT connectivity, canonical payload publishing, device provisioning on the UI, certificate management, and verified command acknowledgement still need an end-to-end hardware integration.
- Physical sensors, calibration records, a live forecast provider, email delivery, production Mapbox credentials, object storage, and production deployment secrets are not supplied here.
- A live geographic map, boundary drawing, georeference control points, zone geometry editing, and measured/predicted overlays are not currently available.
- Some workspace modules remain operational shells with persisted-data empty states; reporting and alert actions have API paths, while resource vendor workflow, workforce identity controls, and many settings still need complete CRUD screens. Do not represent missing sensor measurements as zero or verified values.
- The historical Alembic revisions do not match the existing `aerova_website` schema and must not be applied until reviewed and aligned. No migrations run automatically on application startup.

## Local verification

- `python -m compileall backend/app` — passed.
- `npm run build` — passed after the database-backed UI changes.
- `npm run lint` — exited successfully; reports React effect-state warnings.
