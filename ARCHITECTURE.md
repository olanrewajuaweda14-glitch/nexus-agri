# NEXUS AGRI — System Architecture & Technical Specifications

> **NEXUS AGRI** is an AI-powered agricultural intelligence and decision-support platform that fuses farm context, soil chemistry, multispectral satellite observation, atmospheric forecasting, commodity markets, and deterministic agricultural economics to empower farmers, agronomists, and agribusinesses with actionable farming decisions.

---

## 1. Architectural Philosophy: The Decision Operating Loop

```
   ┌───────────────────────────────────────────────────────────┐
   │                     1. FARM CONTEXT                       │
   │   Coordinates, Hectares, Soil Texture, Crop Variety, DAP  │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │                2. MULTI-STREAM DATA LAYER                 │
   │  Weather (ECMWF) │ Soil (SoilGrids) │ Satellite (Sentinel)│
   │  Markets (AFEX)  │ Economics (NGN)  │ Risk Aggregators    │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │             3. DETERMINISTIC ENGINE & RULES               │
   │  NPK Mass Balance, Water Stress Deficit, Gross Margins,   │
   │  Break-Even Tonnes/Price, Phenology, Spray Windows        │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │             4. INTELLIGENCE & INTERPRETATION              │
   │  Anomaly Detection, Stress Attribution, Provenance Badges │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │           5. DECISION SYNTHESIS (GEMINI 3.8 FLASH)        │
   │  Actionable Recommendation, Why Evidence, Economic Delta, │
   │  Confidence Drivers, Next Immediate Action                │
   └─────────────────────────────┬─────────────────────────────┘
                                 │
                                 ▼
   ┌───────────────────────────────────────────────────────────┐
   │              6. ACTION & FIELD EXECUTION                  │
   │  Timed Spray Window, Split Top-Dressing, Irrigation Hold, │
   │  Commercial Off-take Lock, Audit-Ready Dossier Export     │
   └───────────────────────────────────────────────────────────┘
```

---

## 2. Core Separation of Responsibilities

| Layer | Responsibility | Authority / Technology |
|---|---|---|
| **Deterministic Math** | Break-even analysis, gross margins, NPK deficits, water balance | `src/economicsService.ts`, Express `/api/calculate-economics` |
| **Multimodal Vision** | Leaf pathogen, chlorosis, and damage pattern diagnosis | Gemini 3.8 Flash Vision (`/api/ai/analyze-crop-photo`) |
| **Decision Synthesis** | Multi-stream trade-off reconciliation, actionable advice | Gemini 3.8 Flash (`/api/ai/decision-synthesis`) |
| **Voice Interface** | Field voice readouts and speech summaries | Web Speech API + Gemini (`/api/ai/speech-summary`) |
| **Fallback Agronomist** | Zero-latency, zero-crash deterministic advisory when offline | Pre-calibrated agronomic heuristics in `server.ts` |
| **Client State** | Single source of truth for active farm, scenario, and offline sync | React Context (`AuthContext.tsx`) + `localStorage` |

---

## 3. The 7 Integrated Agricultural Streams

1. **Weather Stream**:
   - **Provider**: European Centre for Medium-Range Weather Forecasts (ECMWF) & GFS model feeds.
   - **Key Parameters**: 7-day cumulative rainfall (mm), hourly temperature, relative humidity, evapotranspiration ($ET_0$), spraying window feasibility (dew point + wind speed $<12$ km/h).

2. **Soil Stream**:
   - **Data Types**: Laboratory assay vs Geospatial estimate (ISRIC SoilGrids 250m).
   - **Key Parameters**: Soil pH (KCl/H2O), CEC (cmol/kg), texture class, available Nitrogen ($N$), Phosphorus ($P$), Potassium ($K$), organic carbon ($OC\%$).

3. **Satellite Multispectral Stream**:
   - **Constellation**: European Space Agency Copernicus Sentinel-2 MSI (10m resolution, 5-day revisit).
   - **Spectral Indices**:
     - $\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$ (Biomass vigor)
     - $\text{EVI} = 2.5 \times \frac{\text{NIR} - \text{Red}}{\text{NIR} + 6 \times \text{Red} - 7.5 \times \text{Blue} + 1}$ (Atmospheric resistance)
     - $\text{SAVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red} + 0.5} \times 1.5$ (Soil-adjusted vegetation)
     - $\text{NDWI} = \frac{\text{NIR} - \text{SWIR}}{\text{NIR} + \text{SWIR}}$ (Leaf water content)

4. **Crop Phenology Stream**:
   - **Crops**: Maize, Cassava, Rice, Soybean, Cowpea, Sorghum, Tomato.
   - **Parameters**: Days After Planting (DAP), current phenological stage, target yield (t/ha), thermal time (Growing Degree Days).

5. **Farm Economics Stream**:
   - **Currency**: Nigerian Naira (₦).
   - **Cost Structure**: 9 deterministic categories: Seed, Fertilizer, Crop Protection Chemicals, Seasonal Labor, Irrigation Fuel, Machinery Rental, Transport, Post-Harvest Storage, Contingencies.
   - **Outputs**: Total Expenditure, Gross Revenue, Operating Margin %, Break-Even Yield (t/ha), Break-Even Commodity Price (₦/t).

6. **Market Intelligence Stream**:
   - **Benchmark**: AFEX Commodity Exchange and Nigerian regional wholesale hub prices (Dawanau, Bodija, Mile 12).
   - **Parameters**: Spot price, 7-day delta %, 30-day price forecast, off-take basis spread.

7. **Risk & Hazard Stream**:
   - **Indices**: Composite Risk, Heat Stress Risk, Drought/Water Logging Risk, Pest Surge Probability, Price Volatility.

---

## 4. Security, Resilience & Privacy Guardrails

- **Server-Side API Keys**: The `GEMINI_API_KEY` is exclusively consumed in `server.ts` through Node.js; it is never transmitted to or bundled inside the browser.
- **In-Memory Rate Limiting**: Strict windowed rate limiters protect expensive endpoints (`/api/ai/*` capped at 30–40 requests/min; `/api/auth/*` capped at 20 requests/min).
- **Prompt Injection Defense**: Sanitizer regex strips override directives (`ignore previous instructions`, `system prompt`, `admin mode`) before prompt interpolation.
- **Zero-Crash Fallback**: If network fails or the API key is not supplied, all AI advisory, photo diagnostic, and speech synthesis endpoints return scientifically grounded agronomic responses marked with `isSimulated: true` and clear provenance caveats.
- **PWA & Offline First**: Standalone Web App Manifest (`/manifest.json`), service worker (`/sw.js`), and `localStorage` snapshotting enable field use even in remote rural connectivity blackouts.

---

## 5. Hackathon Judge Mode Architecture

The application includes an instant **Judge Mode** toggle accessible in the top navigation bar:
- Pre-loads validated Nigerian agricultural parcels (Oyo River Basin, Kaduna Maize Belt).
- Enables 1-click guided interactive inspection across all 7 streams.
- Provides interactive simulation controls to demonstrate "What Changed?" reactive intelligence.
- Features audit dossier export (PDF/Print, CSV dataset, verified JSON backup).
