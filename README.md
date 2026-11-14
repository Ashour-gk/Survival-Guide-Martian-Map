# Mars Explorer

Mars Explorer is a browser-only React application. It does not require .NET, a database, Docker, or a backend service.

## Run locally

Install Node.js, then run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To create a static production build, run `npm run build`; serve the generated `dist` folder from any static web host.

To serve the static build in Docker, run `docker compose up --build` and open `http://localhost:8080`. Compose starts only the frontend web server.

## Local demo behavior

Use crew ID `MARS-01` and password `explore` on the sign-in page. Sign-in is a local demo flow, not account security. Routes and observations are saved in this browser; observation photos are stored in IndexedDB. Clearing browser site data removes this content.

NASA map tiles and NASA image/PDS searches are requested directly by the browser from NASA services, so those features need an internet connection and can be subject to the remote service's availability and browser CORS policy. Verified science layers without a connected data source remain unavailable; the app does not invent measurements or hazards.
