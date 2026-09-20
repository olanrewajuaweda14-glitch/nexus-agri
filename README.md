# NEXUS AGRI — AI-Powered Agricultural Intelligence & Decision Platform

[![Platform: Web & PWA](https://img.shields.io/badge/Platform-Web%20%7C%20PWA-emerald.svg)](https://ai.studio)
[![Engine: Gemini 3.8 Flash](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-blue.svg)](https://deepmind.google/technologies/gemini/)
[![Region: Nigeria & Sub-Saharan Africa](https://img.shields.io/badge/Region-Nigeria%20First-green.svg)](#)

> **NEXUS AGRI** is a production-grade decision intelligence platform that transforms raw agricultural data into clear, defensible, and actionable farming decisions.

---

## ⚡ The 3-Minute Hackathon Judge Walkthrough

1. **Launch**: Open the app. The landing page allows immediate entry via **"Quick Demo"** or **"Judge Mode"** (bypass authentication with pre-seeded agronomic credentials).
2. **Explore the Farm Context**:
   - The top navigation bar displays the active farm (**Green Valley Farm, Oyo Basin**). Switch between Nigerian agro-ecological zones (Oyo, Kaduna, Benue).
   - View the **Multi-Stream Intelligence Ribbon**: Live weather window, soil moisture, Sentinel-2 NDVI (0.81), AFEX commodity price, and composite farm health score (82/100).
3. **Trigger Decision Synthesis**:
   - Click **"Run Multi-Stream Decision Synthesis"** on the Overview Dashboard.
   - Watch the synthesis engine reconcile 7 distinct data feeds: Weather forecast (48mm rain incoming) + Soil moisture (22.4%) + Input costs + Spot prices.
   - Receive the decisive recommendation: *Hold mechanical irrigation for 48 hours to leverage rainfall; schedule split-fertilizer top-dressing for the calm Friday morning spray window.*
4. **Inspect "What Changed?" Dynamic Scenario Simulator**:
   - Navigate to **"Scenario Simulator"**.
   - Modify rainfall expectation, fertilizer cost, or market price.
   - Observe immediate, deterministic recalculation of gross margins, break-even yields, and updated tactical advice.
5. **Test Multimodal Crop Pathology**:
   - Navigate to **"Crop Photo Analysis"**.
   - Upload any leaf photo (or choose a pre-loaded sample: Nitrogen Chlorosis, Southern Leaf Blight, or Healthy Canopy).
   - Receive confidence-scored pathological diagnosis, observable anatomical symptoms, organic remedies, and chemical treatment protocols.
6. **Export Audit Dossier**:
   - Navigate to **"Reports & Export"**.
   - Review the formal agronomic dossier. Download the **structured CSV dataset** or export a verified **JSON backup**.

---

## 🌾 Core Features & Capabilities

- **7-Stream Decision Engine**: Ingests Weather (ECMWF), Soil (SoilGrids + Lab), Satellite (Sentinel-2 MSI), Crop Phenology, Markets (AFEX), Economics (9-cost breakdown), and Climate Hazards.
- **Explainable Decisions**: Every recommendation explains **WHY** (underlying numbers), **ECONOMIC DELTA** (projected margin gain/loss), and **NEXT ACTION** (step-by-step instructions).
- **Deterministic Financial Engine**: Zero-division-safe calculations of operating margin %, break-even yield (t/ha), and cost-per-hectare in Nigerian Naira (₦).
- **Voice Intelligence**: Built-in audio readout and speech summaries for hands-free field operations.
- **PWA & Offline First**: Service worker asset caching and `localStorage` snapshotting ensure reliable operation in rural zones with intermittent connectivity.
- **Production Security**: Server-side proxy for Gemini 3.8 Flash, in-memory rate limiting, prompt injection defenses, and strict input validation.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Express (Node.js), Vite middleware in dev, ESBuild CommonJS bundle for production
- **AI Models**: Google Gemini 3.8 Flash (Multimodal Vision, Tool Synthesis, Text Generation)
- **Data Visualization**: Responsive SVG sparklines, multispectral satellite index gauges, geospatial farm polygon renderers
- **Standards**: PWA (Service Worker, Web App Manifest), Schema.org JSON-LD structured data, WCAG AA contrast compliance

---

## 🚀 Environment Configuration

Create a `.env` file (or configure in AI Studio settings):

```env
# Google Gemini API Key for AI synthesis and vision
GEMINI_API_KEY="your-gemini-api-key"

# Application hosting URL (auto-populated in Cloud Run)
APP_URL="http://localhost:3000"
```

*Note: If `GEMINI_API_KEY` is not present, NEXUS AGRI automatically activates its deterministic agronomic fallback engine, guaranteeing zero downtime or error popups.*

---

## 📄 License & Provenance

Built for the Google AI Studio Hackathon. All satellite, weather, and soil indices cite official open data repositories: ESA Copernicus, ECMWF, ISRIC World Soil Information, and AFEX Commodities Index.
