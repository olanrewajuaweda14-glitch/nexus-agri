# Nexus Agri

**What your farm needs this week.** Put your fields on the map and add your animals, and Nexus Agri turns the live forecast, the soil, each crop's growth stage and each flock's age into one short, dated list of jobs — each with the reason and the numbers behind it — plus the store, the money and the alerts that need you.

Built for smallholder farms and extension agents in Nigeria: phone-first, readable in direct sun, small downloads, and it keeps the last plan when the network drops.

## What it does

| Screen | What you get | Where the numbers come from |
|---|---|---|
| **Home** | The day at a glance: today's weather and spray window, what needs attention, this week's work from every field and every animal group (tick it off from here, with undo), and the whole farm in five lines: fields, animals, store, money. | Everything below |
| **Tasks** | One list: crop jobs from every field, animal health work and your own tasks (once, daily, weekly or monthly), grouped overdue, today, this week and the next 30 days. | Plan engine, health schedules, your tasks |
| **Animals** | Layers, broilers, goats, sheep, pigs, cattle and catfish ponds. Head count from additions, losses, sales and home use; eggs with the laying rate and a 14-day chart; feed for the week in 25 kg bags; when to sell; weights; money in and out per group. | Your records; typical feed intake by age (catfish by weighed average) |
| **Health** | Vaccinations and deworming worked out from each group's age, ticked off with the product used; repeats count from the day it was done. Medicine withdrawal periods (copied from the label) block meat and egg sales until they end. Losses and missed doses flagged for the vet. | NVRI Vom and the Nigerian Newcastle schedule where they pin a date; marked "check with your vet" where practice varies |
| **Store** | Fertilizer, seed, chemicals, feed, medicine and harvest in stock, as a running balance of what came in and went out, with stock-takes and low-stock warnings. A purchase can go straight into a field's record book or an animal group's costs. | Your records |
| **Alerts** | The bell: fertilizer the store can't cover, heavy rain, heat, water stress, overdue jobs, vaccines due, sudden losses, egg drops of 10% or more, heat stress for animals from the forecast, withdrawal periods, low stock, and a reminder when there has been no backup for 30 days. Dismissed alerts come back when something changes. | All of the above |
| **Plan** | This week's jobs, sorted *do now / this week / keep an eye on*. Fertilizer timed for moist soil and away from heavy rain, sprays tied to the next safe window, overdue tasks flagged, tick-off that persists, share to WhatsApp. The plan can be read in Pidgin, Hausa, Yorùbá or Igbo; any job whose figures change in translation stays in English. | Crop calendar (below) + forecast + water balance; translation by Claude |
| **Reminders** | The rest of the season's jobs as a calendar file (7 am alarm on the day each job opens), or one job at a time into Google Calendar. No account or push server. | iCalendar (RFC 5545) built on the phone |
| **Weather** | Hour-by-hour spray windows for 72 h, 8-day forecast with ET₀, last 30 days of rain against the 10-year normal, monthly rainfall climatology. | Open-Meteo forecast API; ERA5 reanalysis via Open-Meteo archive |
| **Field** | Daily root-zone water balance (30 days back, 7 ahead) with the crop's stress line, corrected by your own rain-gauge readings and irrigation log; soil pH, texture, organic carbon, N, CEC and usable water, with plain-language findings and lime estimate. Lab results override the estimate. | FAO-56 single-Kc balance; ISRIC SoilGrids 2.0; Saxton & Rawls (2006) pedotransfer |
| **Money** | Budget with break-evens and a yield × price grid; **buy list** of seed, fertilizer bags and lime for the field, showing what the store already holds; **farm record book** (spend, harvest, sales; CSV and printable export); **sell or store** decision with storage losses, costs and interest; **salt-bottle drying check**. | Your inputs; crop seed and fertilizer rates |
| **Seasons** | Correcting a planting date keeps that season's ticks and records. "Start next season" files the season's yield, spending and sales as the farm's track record, each with its own spreadsheet and printout. | Your record book |
| **Backup** | Everything on the phone in one small file, shared to WhatsApp or Drive or downloaded; restore it on a new phone. Files that aren't Nexus Agri backups are refused before anything is touched. | — |
| **Market prices** | Nearest monitored market's latest price for your crop, 24-month trend, and the usual harvest-to-lean-season swing, feeding the budget and storage tools. | WFP Nigeria market monitoring via HDX (server only) |
| **Field tools** | Measure the field by tapping corners on satellite imagery or walking the edge with GPS; knapsack spray-mix calculator with sprayer calibration; read the weekly plan aloud. | Geodesic area; label dose ÷ calibrated spray volume |
| **Ask** | Questions answered from the farm's computed data — fields, animals and the store — in English, Pidgin, Hausa, Yorùbá or Igbo. Crop photo check returning ranked candidate causes and the field checks that tell them apart. | Claude (Anthropic API), given only the app's computed context; structured JSON answers |

Crops: maize, rice, sorghum, soybean, cowpea, tomato, cassava — early, medium or late varieties. Animals: layers, broilers, goats, sheep, pigs, cattle, catfish.

The farm's name and the farmer's name go on the menu's farm card. On a computer the menu is a sidebar; on a phone it is a bottom bar (Home, Crops, Animals, Money) and a menu for the rest. The type is [Andika](https://software.sil.org/andika/), SIL's typeface for new readers, which draws every Hausa, Yorùbá and Igbo letter.

## What it deliberately does not do

- **No invented data.** If a source is down the screen says so and shows the last saved copy with its age. With no forecast at all, calendar jobs still appear, with plain field checks in place of weather timing. There is no "simulated" AI fallback: if the Claude API key isn't configured, the advisor says it is off and everything else keeps working.
- **No fake satellite or market feeds.** There is no free, keyless NDVI feed, so the app shows none. Market prices are WFP's monitored-market figures, shown with the market and month they come from; where there are none, prices are entered by the user.
- **No accounts.** Farms, ticks and budgets live in the browser's storage on the device. A backup file moves them to a new phone.
- **No unchecked translation.** Claude translates only the plan's text. The app compares the figures in every translated job with the English and keeps the English for any job where a number changed.
- **No guessed medicine data.** Withdrawal periods differ by product, so the farmer copies them from the label and the app counts the days. Vaccination timings that differ between products and vets are labelled as such.

## The agronomy

All logic is in `src/lib/` and is plain, tested TypeScript — no AI involved.

- **Crop calendar** (`crops.ts`): stage boundaries and FAO-56 stage lengths/Kc per crop, plus field operations by days after planting with rates in kg/ha *and* 50 kg bags (e.g. maize: basal NPK 15-15-15 8 bags/ha at 0–14 DAP; urea 2½ bags/ha at 28–42 DAP). Rates follow standard Nigerian extension guidance and should be adjusted to a soil test.
- **Water balance** (`engine/water.ts`): `Dr = Dr − Peff + Ks·Kc·ET0`, root depth growing through development, TAW from soil texture, stress when depletion exceeds `p·TAW`. Forecast rain is weighted by its probability. Initialised from the weather model's soil moisture. The farmer's log overrides the model: a rain-gauge reading replaces gridded rain for that day, irrigation is added, and "watered fully" refills the root zone.
- **Spray windows** (`engine/spray.ts`): daylight, wind 3–15 km/h (calm = inversion risk), no rain that hour or the 4 h after, ≤30 °C, RH ≥ 40%.
- **Plan** (`engine/plan.ts`): calendar tasks + weather timing + irrigation amount (mm and m³) + heavy-rain, heat-at-flowering and leaf-wetness disease alerts + rain-onset check before planting.
- **Livestock** (`livestock.ts`): health steps by age window. Where a source fixes the timing it is used as is: Newcastle disease Hitchner B1 at day old, La Sota at 1–2 weeks and Komarov at 7–10 weeks (Nigerian schedule); PPR from 3 months of age, then every 12 months (NVRI Vom); piglet iron at about day 3. Gumboro days, fowl pox age, deworming intervals and the yearly cattle vaccines vary by product and vet, and are shown as "check with your vet". Repeats count from the day a step was actually done; a group bought older starts with an unrecorded vaccine due on arrival. Feed: typical commercial broiler and pullet intake by week, layer mash at 115 g a day, catfish at a share of weighed body weight (7% below 5 g down to 1.2% above 600 g, after FAO guidance). Alerts: poultry losses of 3% in a week (or 1% and two birds in a day), any loss in a small herd, a 10% fall in the laying rate week on week, and forecast highs at or above each species' heat-stress temperature.
- **Agenda and alerts** (`agenda.ts`): one ordered list of crop jobs, animal health steps and own tasks, and the alerts built from the same data, with stable ids so a dismissed alert returns only when its facts change.

## Run it

```bash
npm install
cp .env.example .env    # add ANTHROPIC_API_KEY to enable the advisor (optional)
npm run dev             # http://localhost:3000
```

```bash
npm test                # unit tests: agronomy and livestock engines, store, tasks, alerts, data normalisers, API handler, calendar, backup, translation checks
npm run e2e             # browser tests on phone and desktop sizes (first run: npx playwright install chromium)
npm run lint            # strict TypeScript
npm run build && npm start
```

### Hosting

- **Vercel** — import the repo with the Vite preset. The static app is built from `dist/`, and `api/[route].ts` becomes a serverless function for every `/api/*` route. To turn on the AI advisor, add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) under *Project → Settings → Environment Variables*, then redeploy.
- **Any Node host** — Render, Railway, Fly, Cloud Run, AI Studio, a VPS: `npm run build && npm start`. The server needs outbound HTTPS to `api.open-meteo.com`, `archive-api.open-meteo.com`, `rest.isric.org`, `nominatim.openstreetmap.org`, `data.humdata.org` (market prices) and `api.anthropic.com`.
- **Static only** — GitHub Pages, Netlify without functions, `vite preview`: deploy `dist/`. The app notices there is no server behind `/api` and fetches weather, climate, soil and place names straight from the public APIs in the browser. Only the Ask tab is unavailable, and it says so.

Express (`server.ts`) and the Vercel function share one implementation in `server/handlers.ts`.

Map tiles always load in the browser from `server.arcgisonline.com`.

## Layout

```
server.ts            Express server (local dev, Node hosts)
api/[route].ts       Vercel serverless function
server/handlers.ts   All /api routes: weather, climate, soil, place, prices, ask, diagnose, translate, health
server/sources.ts    Upstream fetch, trim (~15 KB weather bundle), cache per location
server/ai.ts         Claude prompts with Zod-validated structured output; no made-up fallback answers
src/Shell.tsx        Navigation: sidebar on a computer, bottom bar and menu on a phone, the alerts bell
src/lib/crops.ts     Crop knowledge base
src/lib/livestock.ts Animal knowledge base: health schedules, feed, losses, eggs, withdrawal periods
src/lib/engine/      stage, water, spray, soil, plan, economics
src/lib/             agenda (tasks and alerts), stock (the store), tasks, hub (farm-wide records),
                     seasons, calendar (iCalendar), backup, translate (figure check), records
src/screens/         Home, Tasks, Today (Plan), Weather, Field, Animals, Health, Stock (Store),
                     Money, Ask, Alerts, FarmForm, Backup, Welcome
tests/               Vitest suites and weather fixtures
e2e/                 Playwright: every screen on phone and desktop sizes
```

## Data sources and licences

Open-Meteo (CC BY 4.0) · ERA5 / Copernicus Climate Change Service · ISRIC SoilGrids 2.0 (CC BY 4.0) · OpenStreetMap Nominatim (ODbL) · Esri World Imagery · FAO Irrigation and Drainage Paper 56 (Allen et al., 1998) · Saxton & Rawls, SSSAJ 70:1569 (2006).
