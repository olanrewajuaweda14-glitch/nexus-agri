# Nexus Agri

**What your farm needs this week.** Put a field on the map, say what you planted and when, and Nexus Agri turns the live forecast, the soil under that point and the crop's growth stage into a short, dated list of jobs — each with the reason and the numbers behind it.

Built for smallholder farms and extension agents in Nigeria: phone-first, readable in direct sun, small downloads, and it keeps the last plan when the network drops.

## What it does

| Screen | What you get | Where the numbers come from |
|---|---|---|
| **Plan** | This week's jobs, sorted *do now / this week / keep an eye on*. Fertilizer timed for moist soil and away from heavy rain, sprays tied to the next safe window, overdue tasks flagged, tick-off that persists, share to WhatsApp. | Crop calendar (below) + forecast + water balance |
| **Weather** | Hour-by-hour spray windows for 72 h, 8-day forecast with ET₀, last 30 days of rain against the 10-year normal, monthly rainfall climatology. | Open-Meteo forecast API; ERA5 reanalysis via Open-Meteo archive |
| **Field** | Daily root-zone water balance (30 days back, 7 ahead) with the crop's stress line; soil pH, texture, organic carbon, N, CEC and usable water, with plain-language findings and lime estimate. Lab results override the estimate. | FAO-56 single-Kc balance; ISRIC SoilGrids 2.0; Saxton & Rawls (2006) pedotransfer |
| **Money** | Per-hectare budget, margin, break-even yield and price, and a yield × price profit grid. | Your inputs (example figures until you change them) |
| **Ask** | Questions answered from the farm's computed data, in English, Pidgin, Hausa, Yorùbá or Igbo. Photo check returning ranked candidate causes and the field checks that tell them apart. | Gemini, given only the app's computed context |

Crops: maize, rice, sorghum, soybean, cowpea, tomato, cassava — early, medium or late varieties.

## What it deliberately does not do

- **No invented data.** If a source is down the screen says so and shows the last saved copy with its age. With no forecast at all, calendar jobs still appear, with plain field checks in place of weather timing. There is no "simulated" AI fallback: if Gemini isn't configured, the advisor says it is off and everything else keeps working.
- **No fake satellite or market feeds.** Free, keyless NDVI and Nigerian market-price APIs don't exist; showing made-up numbers labelled "live" would mislead farmers. Prices are entered by the user.
- **No accounts.** Farms, ticks and budgets live in the browser's storage on the device.

## The agronomy

All logic is in `src/lib/` and is plain, tested TypeScript — no AI involved.

- **Crop calendar** (`crops.ts`): stage boundaries and FAO-56 stage lengths/Kc per crop, plus field operations by days after planting with rates in kg/ha *and* 50 kg bags (e.g. maize: basal NPK 15-15-15 8 bags/ha at 0–14 DAP; urea 2½ bags/ha at 28–42 DAP). Rates follow standard Nigerian extension guidance and should be adjusted to a soil test.
- **Water balance** (`engine/water.ts`): `Dr = Dr − Peff + Ks·Kc·ET0`, root depth growing through development, TAW from soil texture, stress when depletion exceeds `p·TAW`. Forecast rain is weighted by its probability. Initialised from the weather model's soil moisture.
- **Spray windows** (`engine/spray.ts`): daylight, wind 3–15 km/h (calm = inversion risk), no rain that hour or the 4 h after, ≤30 °C, RH ≥ 40%.
- **Plan** (`engine/plan.ts`): calendar tasks + weather timing + irrigation amount (mm and m³) + heavy-rain, heat-at-flowering and leaf-wetness disease alerts + rain-onset check before planting.

## Run it

```bash
npm install
cp .env.example .env    # add GEMINI_API_KEY to enable the advisor (optional)
npm run dev             # http://localhost:3000
```

```bash
npm test                # engine + data-normaliser tests
npm run lint            # strict TypeScript
npm run build && npm start
```

### Hosting

- **Vercel** — import the repo with the Vite preset. The static app is built from `dist/`, and `api/[route].ts` becomes a serverless function for every `/api/*` route. To turn on the AI advisor, add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under *Project → Settings → Environment Variables*, then redeploy.
- **Any Node host** — Render, Railway, Fly, Cloud Run, AI Studio, a VPS: `npm run build && npm start`. The server needs outbound HTTPS to `api.open-meteo.com`, `archive-api.open-meteo.com`, `rest.isric.org`, `nominatim.openstreetmap.org` and `generativelanguage.googleapis.com`.
- **Static only** — GitHub Pages, Netlify without functions, `vite preview`: deploy `dist/`. The app notices there is no server behind `/api` and fetches weather, climate, soil and place names straight from the public APIs in the browser. Only the Ask tab is unavailable, and it says so.

Express (`server.ts`) and the Vercel function share one implementation in `server/handlers.ts`.

Map tiles always load in the browser from `server.arcgisonline.com`.

## Layout

```
server.ts            Express server (local dev, Node hosts)
api/[route].ts       Vercel serverless function
server/handlers.ts   All /api routes: weather, climate, soil, place, ask, diagnose, health
server/sources.ts    Upstream fetch, trim (~15 KB weather bundle), cache per location
server/ai.ts         Gemini prompts with JSON schemas; no fallback answers
src/lib/crops.ts     Crop knowledge base
src/lib/engine/      stage · water · spray · soil · plan · economics
src/screens/         Today (Plan) · Weather · Field · Money · Ask · FarmForm · Welcome
tests/               Vitest suites and weather fixtures
```

## Data sources and licences

Open-Meteo (CC BY 4.0) · ERA5 / Copernicus Climate Change Service · ISRIC SoilGrids 2.0 (CC BY 4.0) · OpenStreetMap Nominatim (ODbL) · Esri World Imagery · FAO Irrigation and Drainage Paper 56 (Allen et al., 1998) · Saxton & Rawls, SSSAJ 70:1569 (2006).
