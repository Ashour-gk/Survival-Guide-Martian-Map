# Mars Explorer API

The frontend is backed by ASP.NET Core and SQL Server. Crew sign-in uses crew ID and password, with password hashes stored by ASP.NET Identity. Sessions use an HTTP-only cookie. Failed sign-ins are rate limited and temporary lockout is enforced by the API.

## Current API

All API routes use `/api/v1`. State-changing browser requests must include `X-Requested-With: XMLHttpRequest`.

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /sites`, `GET /sites/{id}`, `GET /sites/{id}/layers`, `GET /sites/{id}/hazards`, `GET /sites/{id}/pov`
- `GET /point`
- `GET /map/tiles/{basemap}/{z}/{row}/{column}.{extension}` — NASA Mars Trek imagery proxy
- `GET/POST /observations`, `GET /observations/{id}`
- `POST /observations/{id}/files`, `GET /observations/{id}/files/{fileId}`
- `GET/PUT /routes/me`
- `GET /health`

## Observation access

Observations are saved as submitted records. Each crew account can read its own records. Photo uploads are limited to five JPEG, PNG, or WebP files of up to 5 MB each; the API checks file signatures and stores photo bytes outside the web root. There is no observation review, approval, rejection, or admin-console workflow.

## Data sources

The map uses NASA Mars Trek Viking, CTX, and HiRISE imagery. The seeded site is the Gale Crater/Curiosity region. Terrain, temperature, mineral, radiation, hazard, and rover telemetry values remain unavailable until verified sources are connected. Crew-entered readings are kept as user-submitted data.
