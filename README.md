# Mars Explorer

Mars Explorer is a React application with an ASP.NET Core Web API and EF Core database. Development uses a local SQLite file; Docker deployments can continue to use SQL Server. The unauthenticated landing page is an animated 3D Mars globe using NASA Mars Trek Viking imagery. Sign-in uses a database-backed crew ID and password. There is no public registration, admin console, or observation approval workflow.

## Run locally

Prerequisites for local development: .NET 10 SDK and Node.js. SQL Server 2022 or Docker Desktop is needed only for the SQL Server deployment profile.

### SQLite local development

The Development environment selects SQLite and creates `src/MarsExplorer.Api/mars-explorer.db` on first run. Start the API and frontend:

```powershell
dotnet run --project src/MarsExplorer.Api
npm install
npm run dev
```

SQLite uses EF Core `EnsureCreated` for a fresh local database; SQL Server continues to use the checked-in EF migrations. To switch to SQL Server, set `Database:Provider` to `SqlServer` and configure `ConnectionStrings:MarsExplorer`.

### Docker SQL Server and API

1. Copy `.env.example` to `.env` and set a unique value for `MSSQL_SA_PASSWORD`.
2. Start SQL Server and the API: `docker compose up --build`.
3. In another terminal, run `npm install` and `npm run dev`.
4. Open `http://localhost:5173`. Swagger is at `http://localhost:5080/swagger`; health is at `http://localhost:5080/health`.

The sign-in page accepts only crew ID and password. Accounts are provisioned directly in the database. The API applies EF Core migrations on SQL Server startup and seeds the Mars sites in either provider.

### Installed SQL Server

Set the SQL connection string in user-secrets, then run the API and frontend:

```powershell
dotnet user-secrets set "ConnectionStrings:MarsExplorer" "Server=localhost;Database=MarsExplorer;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False" --project src/MarsExplorer.Api
dotnet run --project src/MarsExplorer.Api
npm install
npm run dev
```

## API

API routes use `/api/v1`, JSON camelCase, and cookie authentication. State-changing requests require `X-Requested-With: XMLHttpRequest`.

- Auth: `POST /auth/login` (crew ID and password), `POST /auth/logout`, `GET /auth/me`
- Sites and science data: `GET /sites`, `GET /sites/{id}`, `GET /sites/{id}/layers`, `GET /sites/{id}/hazards`, `GET /sites/{id}/pov`, `GET /point`
- Map imagery: `GET /map/tiles/{basemap}/{z}/{row}/{column}.{extension}` (NASA Mars Trek proxy)
- Observations: `GET/POST /observations`, `GET /observations/{id}`, `POST /observations/{id}/files`, `GET /observations/{id}/files/{fileId}`
- Saved routes: `GET/PUT /routes/me`
- Health: `GET /health`

Observation photos are validated and stored on the API host or configured upload volume. Route stops and observation records are stored in the selected database. Each crew account can read only its own observations; submitted observations have no review or approval workflow.

## Data and imagery

The map and globe use real NASA Mars Trek Viking, CTX, and HiRISE imagery via the API tile proxy. The seeded Gale Crater site identifies the Curiosity exploration region; it does not imply live rover telemetry. No synthetic elevation, temperature, radiation, mineral, hazard, account, route, or observation records are presented as real. Science layers without a verified connected source remain unavailable. User-submitted crew readings are labeled as crew supplied.

The supplied RedTrace data reference includes sources for multiple Mars regions. Data are only shown where a source is connected and appropriate for the selected site; Jezero-specific products are not treated as Gale measurements.
