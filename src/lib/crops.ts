import type { ActionKind, CostLine, CropId, Maturity } from './types';

/**
 * Crop knowledge base.
 *
 * Stage lengths and crop coefficients (Kc) follow FAO Irrigation & Drainage
 * Paper 56 (Allen et al., 1998), tables 11–12 and 22, adjusted to typical
 * medium-maturity varieties grown in Nigeria. Field-operation timings and
 * fertilizer rates follow standard Nigerian extension practice (NAERLS / IITA
 * production guides). Everything is expressed in days after planting (DAP)
 * for a medium-maturity variety and stretched or shrunk for early/late ones.
 */

export interface CropStage {
  name: string;
  startDap: number;
  note: string;
}

export interface CropTask {
  id: string;
  kind: ActionKind;
  title: string;
  fromDap: number;
  toDap: number;
  how: string;
  /** Recurs every N days inside the window (e.g. weekly scouting). */
  repeatDays?: number;
  /** Should be done in a calm, rain-free window. */
  needsSprayWindow?: boolean;
  /** Fertilizer: soil should be moist and no heavy rain within 24 h. */
  needsMoistSoil?: boolean;
  /** Fertilizer product and rate, used to work out the amount for the farm's size. */
  dose?: { product: string; kgPerHa: number };
}

export interface CropDef {
  id: CropId;
  name: string;
  plantingLabel: string;
  /** Days to physiological maturity for a medium variety. */
  maturityDays: number;
  /** FAO-56 stage lengths: initial, development, mid-season, late. Sum = maturityDays. */
  faoStages: [number, number, number, number];
  kc: { ini: number; mid: number; end: number };
  /** FAO-56 soil-water depletion fraction before stress starts. */
  p: number;
  rootDepthM: { min: number; max: number };
  /** Max temperature above which flowering is damaged, and the stage index where it matters. */
  heat?: { tMaxC: number; stageIndex: number };
  phRange: [number, number];
  legume: boolean;
  humidDiseases: string;
  stages: CropStage[];
  tasks: CropTask[];
  /** Planting material per hectare (standard extension rates). */
  seed: { item: string; perHa: number; unit: 'kg' | 'g' | 'bundles'; note: string };
  exampleBudget: { pricePerTon: number; yieldTHa: number; costs: CostLine[] };
}

const costs = (seed: number, fert: number, chem: number, land: number, labour: number, harvest: number, haul: number): CostLine[] => [
  { id: 'seed', label: 'Seed / planting material', amount: seed },
  { id: 'fert', label: 'Fertilizer', amount: fert },
  { id: 'chem', label: 'Herbicide & pesticide', amount: chem },
  { id: 'land', label: 'Land preparation', amount: land },
  { id: 'labour', label: 'Labour (planting, weeding)', amount: labour },
  { id: 'harvest', label: 'Harvest & processing', amount: harvest },
  { id: 'haul', label: 'Bags, transport, storage', amount: haul },
];

export const CROPS: Record<CropId, CropDef> = {
  maize: {
    id: 'maize',
    name: 'Maize',
    plantingLabel: 'Sowing date',
    maturityDays: 120,
    faoStages: [20, 35, 40, 25],
    kc: { ini: 0.3, mid: 1.2, end: 0.35 },
    p: 0.55,
    rootDepthM: { min: 0.3, max: 1.0 },
    heat: { tMaxC: 35, stageIndex: 3 },
    phRange: [5.5, 7.0],
    legume: false,
    humidDiseases: 'grey leaf spot and northern leaf blight',
    stages: [
      { name: 'Emergence', startDap: 0, note: 'Seedlings break through in 5–8 days if the soil is moist.' },
      { name: 'Early vegetative', startDap: 8, note: 'V2–V5. Weed competition does the most damage now.' },
      { name: 'Rapid growth', startDap: 25, note: 'V6–V12. Ear size is being set; nitrogen demand climbs fast.' },
      { name: 'Tasseling & silking', startDap: 55, note: 'The most water- and heat-sensitive two weeks of the season.' },
      { name: 'Grain fill', startDap: 65, note: 'Kernels fill from milk to dough to dent.' },
      { name: 'Maturity & dry-down', startDap: 105, note: 'Black layer forms; grain dries in the field.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'NPK 15-15-15', kgPerHa: 400 }, title: 'Apply basal NPK 15-15-15', fromDap: 0, toDap: 14, needsMoistSoil: true,
        how: '8 bags (400 kg) per hectare, banded 5 cm beside and below the seed row. Supplies about 60 kg each of N, P₂O₅ and K₂O.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 24,
        how: 'Hoe or apply a post-emergence herbicide. Keep the crop weed-free for the first 6 weeks.' },
      { id: 'faw', kind: 'scout', title: 'Scout for fall armyworm', fromDap: 7, toDap: 55, repeatDays: 7,
        how: 'Walk a W-pattern and check 20 plants in each of 5 spots. Act if more than 1 in 5 plants show fresh window-pane feeding or wet frass in the whorl.' },
      { id: 'topdress', kind: 'fertilizer', dose: { product: 'urea', kgPerHa: 130 }, title: 'Top-dress with urea', fromDap: 28, toDap: 42, needsMoistSoil: true,
        how: '2½ bags (130 kg) per hectare (~60 kg N), placed 5–8 cm from the plant and covered with soil.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding and earthing-up', fromDap: 35, toDap: 48,
        how: 'Earth up soil around the stems to support roots before the plants get tall.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest', fromDap: 110, toDap: 135,
        how: 'Harvest when husks are dry and kernels show a black layer at the base. Dry to 13% moisture and store in hermetic bags.' },
    ],
    seed: { item: 'Maize seed (improved variety)', perHa: 25, unit: 'kg', note: '2 seeds per hole at 75 × 25 cm, thinned to 1 — about 53,000 plants/ha.' },
    exampleBudget: { pricePerTon: 550_000, yieldTHa: 3, costs: costs(60_000, 495_000, 60_000, 80_000, 150_000, 70_000, 50_000) },
  },

  rice: {
    id: 'rice',
    name: 'Rice',
    plantingLabel: 'Sowing / transplanting date',
    maturityDays: 120,
    faoStages: [20, 30, 45, 25],
    kc: { ini: 1.05, mid: 1.2, end: 0.75 },
    p: 0.2,
    rootDepthM: { min: 0.3, max: 0.5 },
    heat: { tMaxC: 35, stageIndex: 3 },
    phRange: [5.0, 6.5],
    legume: false,
    humidDiseases: 'blast and brown spot',
    stages: [
      { name: 'Establishment', startDap: 0, note: 'Roots take hold; keep the field evenly moist or shallow-flooded.' },
      { name: 'Tillering', startDap: 20, note: 'Each plant multiplies its stems. Weeds and nitrogen decide tiller count.' },
      { name: 'Panicle initiation', startDap: 50, note: 'The grain head starts forming inside the stem.' },
      { name: 'Booting & heading', startDap: 65, note: 'Most sensitive to drought and heat above 35 °C.' },
      { name: 'Grain fill', startDap: 80, note: 'Milk, dough, then hard grain. Birds become the main threat.' },
      { name: 'Maturity', startDap: 110, note: '80–85% of grains straw-coloured.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'NPK 15-15-15', kgPerHa: 200 }, title: 'Apply basal NPK 15-15-15', fromDap: 0, toDap: 10, needsMoistSoil: true,
        how: '4 bags (200 kg) per hectare, incorporated at the final puddling or within 10 days of sowing.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 24, how: 'Hand-pull or use a selective post-emergence herbicide.' },
      { id: 'urea1', kind: 'fertilizer', dose: { product: 'urea', kgPerHa: 65 }, title: 'First urea split (tillering)', fromDap: 21, toDap: 30, needsMoistSoil: true,
        how: '1¼ bags (65 kg) urea per hectare. In paddies, drain to a thin water film, broadcast, then re-flood after 2 days.' },
      { id: 'scout', kind: 'scout', title: 'Scout for stem borer and blast', fromDap: 14, toDap: 90, repeatDays: 7,
        how: 'Look for dead hearts (dry central shoot) and spindle-shaped grey lesions on leaves.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding', fromDap: 35, toDap: 45, how: 'Last weeding before the canopy closes.' },
      { id: 'urea2', kind: 'fertilizer', dose: { product: 'urea', kgPerHa: 65 }, title: 'Second urea split (panicle initiation)', fromDap: 45, toDap: 55, needsMoistSoil: true,
        how: '1¼ bags (65 kg) urea per hectare.' },
      { id: 'birds', kind: 'other', title: 'Bird scaring', fromDap: 80, toDap: 110, how: 'Quelea and weaver birds can take a large share of the crop at milk stage. Guard mornings and evenings.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest', fromDap: 110, toDap: 128, how: 'Cut when 80–85% of grains are straw-coloured. Thresh and dry to 14% moisture within 24 h to protect milling quality.' },
    ],
    seed: { item: 'Rice seed', perHa: 60, unit: 'kg', note: 'For transplanting or drilling. Broadcasting needs 80–100 kg/ha.' },
    exampleBudget: { pricePerTon: 700_000, yieldTHa: 3.5, costs: costs(70_000, 270_000, 70_000, 120_000, 220_000, 120_000, 60_000) },
  },

  sorghum: {
    id: 'sorghum',
    name: 'Sorghum',
    plantingLabel: 'Sowing date',
    maturityDays: 120,
    faoStages: [20, 35, 40, 25],
    kc: { ini: 0.3, mid: 1.05, end: 0.55 },
    p: 0.55,
    rootDepthM: { min: 0.3, max: 1.2 },
    heat: { tMaxC: 38, stageIndex: 3 },
    phRange: [5.5, 7.5],
    legume: false,
    humidDiseases: 'anthracnose and grain mould',
    stages: [
      { name: 'Emergence', startDap: 0, note: 'Slow early growth; seedlings compete poorly with weeds.' },
      { name: 'Vegetative', startDap: 10, note: 'Leaf area builds. Watch for Striga emerging from 4 weeks.' },
      { name: 'Booting', startDap: 55, note: 'The head swells inside the flag leaf.' },
      { name: 'Flowering', startDap: 65, note: 'Heat above 38 °C and drought now cut seed set.' },
      { name: 'Grain fill', startDap: 75, note: 'Grain hardens; head bugs and birds are the main risk.' },
      { name: 'Maturity', startDap: 110, note: 'Black spot at the base of the grain.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'NPK 15-15-15', kgPerHa: 200 }, title: 'Apply basal NPK 15-15-15', fromDap: 0, toDap: 14, needsMoistSoil: true,
        how: '4 bags (200 kg) per hectare, banded beside the row.' },
      { id: 'thin', kind: 'other', title: 'Thin to 2 plants per stand', fromDap: 14, toDap: 21, how: 'Do it on a moist day so pulled seedlings come out cleanly.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 24, how: 'Weed early — sorghum seedlings are weak competitors.' },
      { id: 'urea', kind: 'fertilizer', dose: { product: 'urea', kgPerHa: 75 }, title: 'Top-dress with urea', fromDap: 28, toDap: 42, needsMoistSoil: true,
        how: '1½ bags (75 kg) urea per hectare beside the row, covered with soil.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding; pull Striga before it flowers', fromDap: 35, toDap: 50,
        how: 'Uproot Striga plants by hand before they set seed — each plant can shed tens of thousands of seeds.' },
      { id: 'headbug', kind: 'scout', title: 'Scout heads for midge and head bugs', fromDap: 60, toDap: 85, repeatDays: 7,
        how: 'Shake heads over a white sheet in the morning. Many bugs per head at milk stage justifies a spray.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest', fromDap: 110, toDap: 130, how: 'Cut heads when grain is hard and shows a black spot at the base. Dry before threshing.' },
    ],
    seed: { item: 'Sorghum seed', perHa: 10, unit: 'kg', note: 'Drill at 75 cm rows, thin to 2 plants per stand.' },
    exampleBudget: { pricePerTon: 500_000, yieldTHa: 2, costs: costs(25_000, 240_000, 40_000, 70_000, 120_000, 60_000, 40_000) },
  },

  soybean: {
    id: 'soybean',
    name: 'Soybean',
    plantingLabel: 'Sowing date',
    maturityDays: 110,
    faoStages: [20, 30, 40, 20],
    kc: { ini: 0.4, mid: 1.15, end: 0.5 },
    p: 0.5,
    rootDepthM: { min: 0.3, max: 0.9 },
    heat: { tMaxC: 36, stageIndex: 2 },
    phRange: [6.0, 7.0],
    legume: true,
    humidDiseases: 'soybean rust',
    stages: [
      { name: 'Emergence', startDap: 0, note: 'Nodules start forming 2–3 weeks after emergence if seed was inoculated.' },
      { name: 'Vegetative', startDap: 10, note: 'Leaves and nodules build. Weed-free period matters most.' },
      { name: 'Flowering (R1–R2)', startDap: 40, note: 'Flowers open from the lower nodes upward.' },
      { name: 'Pod set (R3–R4)', startDap: 55, note: 'Water stress now drops pods.' },
      { name: 'Seed fill (R5–R6)', startDap: 70, note: 'Seeds swell; demand for water peaks.' },
      { name: 'Maturity', startDap: 100, note: '95% of pods brown. Harvest fast — pods shatter.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'single super phosphate', kgPerHa: 200 }, title: 'Apply SSP and inoculate seed', fromDap: 0, toDap: 7, needsMoistSoil: true,
        how: '4 bags (200 kg) single super phosphate per hectare (~36 kg P₂O₅). Inoculate seed with Bradyrhizobium on the day of sowing. No nitrogen top-dress is needed.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 24, how: 'Hoe shallowly to avoid damaging roots and nodules.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding', fromDap: 35, toDap: 45, how: 'Last weeding before the canopy closes.' },
      { id: 'scout', kind: 'scout', title: 'Scout for rust and pod-sucking bugs', fromDap: 40, toDap: 85, repeatDays: 7,
        how: 'Check undersides of lower leaves for tan-brown rust pustules; check pods for stink bugs.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest', fromDap: 100, toDap: 115, how: 'Harvest when 95% of pods are brown. Delays of a week can lose 10–20% to shattering.' },
    ],
    seed: { item: 'Soybean seed', perHa: 60, unit: 'kg', note: 'Rows 60–75 cm apart, 5 cm within the row. Buy inoculant for the same area.' },
    exampleBudget: { pricePerTon: 750_000, yieldTHa: 1.8, costs: costs(55_000, 140_000, 50_000, 70_000, 120_000, 60_000, 40_000) },
  },

  cowpea: {
    id: 'cowpea',
    name: 'Cowpea',
    plantingLabel: 'Sowing date',
    maturityDays: 85,
    faoStages: [15, 25, 30, 15],
    kc: { ini: 0.4, mid: 1.05, end: 0.35 },
    p: 0.45,
    rootDepthM: { min: 0.3, max: 0.8 },
    heat: { tMaxC: 35, stageIndex: 3 },
    phRange: [5.5, 6.5],
    legume: true,
    humidDiseases: 'Cercospora leaf spot and scab',
    stages: [
      { name: 'Emergence', startDap: 0, note: 'Fast emergence in warm, moist soil.' },
      { name: 'Vegetative', startDap: 7, note: 'Canopy spreads; aphids can build up in dry spells.' },
      { name: 'Flower bud', startDap: 33, note: 'Thrips and Maruca attack the buds — the first critical spray.' },
      { name: 'Flowering', startDap: 42, note: 'Flowers drop under heat and water stress.' },
      { name: 'Podding', startDap: 50, note: 'Pod borers and pod-sucking bugs — the second critical spray.' },
      { name: 'Maturity', startDap: 75, note: 'Pods dry and turn straw-coloured.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'single super phosphate', kgPerHa: 125 }, title: 'Apply single super phosphate', fromDap: 0, toDap: 7, needsMoistSoil: true,
        how: '2–3 bags (100–150 kg) SSP per hectare at sowing. Cowpea fixes its own nitrogen.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 21, how: 'Weed before the canopy spreads.' },
      { id: 'spray1', kind: 'spray', title: 'Insecticide spray at flower-bud stage', fromDap: 33, toDap: 40, needsSprayWindow: true,
        how: 'Targets thrips and Maruca pod borer. Use a registered insecticide (e.g. lambda-cyhalothrin) at label rate.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding', fromDap: 30, toDap: 36, how: 'Last weeding — later passes damage flowers.' },
      { id: 'spray2', kind: 'spray', title: 'Insecticide spray at podding', fromDap: 47, toDap: 56, needsSprayWindow: true,
        how: 'Targets pod borers and pod-sucking bugs. A third spray 10 days later is common where pressure is high.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest dry pods', fromDap: 70, toDap: 92,
        how: 'Pick pods as they dry. Store threshed grain in triple-layer hermetic bags to stop bruchid weevils.' },
    ],
    seed: { item: 'Cowpea seed', perHa: 25, unit: 'kg', note: '2 seeds per hole at 75 × 25 cm.' },
    exampleBudget: { pricePerTon: 900_000, yieldTHa: 1.2, costs: costs(40_000, 90_000, 80_000, 60_000, 110_000, 60_000, 40_000) },
  },

  tomato: {
    id: 'tomato',
    name: 'Tomato',
    plantingLabel: 'Transplanting date',
    maturityDays: 110,
    faoStages: [20, 30, 40, 20],
    kc: { ini: 0.6, mid: 1.15, end: 0.8 },
    p: 0.4,
    rootDepthM: { min: 0.25, max: 0.8 },
    heat: { tMaxC: 32, stageIndex: 2 },
    phRange: [6.0, 6.8],
    legume: false,
    humidDiseases: 'early and late blight',
    stages: [
      { name: 'Establishment', startDap: 0, note: 'Transplants recover over 7–10 days; water lightly and often.' },
      { name: 'Vegetative', startDap: 14, note: 'Stems and leaves build. Stake and train now.' },
      { name: 'Flowering', startDap: 30, note: 'Flowers abort above ~32 °C or in dry wind.' },
      { name: 'Fruit set', startDap: 45, note: 'Uneven watering now causes blossom-end rot and cracking.' },
      { name: 'Harvest period', startDap: 65, note: 'Pick every 2–3 days at breaker stage.' },
      { name: 'Late harvest', startDap: 95, note: 'Yields taper; clean up plant debris after.' },
    ],
    tasks: [
      { id: 'basal', kind: 'fertilizer', dose: { product: 'NPK 15-15-15', kgPerHa: 250 }, title: 'Apply basal NPK 15-15-15', fromDap: 0, toDap: 7, needsMoistSoil: true,
        how: '5 bags (250 kg) per hectare worked into the beds at transplanting.' },
      { id: 'stake', kind: 'other', title: 'Stake and tie plants', fromDap: 14, toDap: 24, how: 'Keeps fruit off the soil and improves airflow, which cuts blight.' },
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 14, toDap: 24, how: 'Shallow hoeing; mulch afterwards to hold moisture.' },
      { id: 'tuta', kind: 'scout', title: 'Scout for Tuta absoluta', fromDap: 7, toDap: 100, repeatDays: 7,
        how: 'Look for papery mines in leaves and holes in fruit. Pheromone traps give early warning.' },
      { id: 'topdress', kind: 'fertilizer', dose: { product: 'CAN', kgPerHa: 100 }, title: 'Top-dress with CAN at first flowering', fromDap: 28, toDap: 36, needsMoistSoil: true,
        how: '2 bags (100 kg) calcium ammonium nitrate per hectare. The calcium helps against blossom-end rot.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding', fromDap: 35, toDap: 45, how: 'Remove weeds that host whiteflies and thrips.' },
      { id: 'harvest', kind: 'harvest', title: 'Start harvesting', fromDap: 65, toDap: 110, repeatDays: 3,
        how: 'Pick at breaker stage (first blush of colour). Pack in crates, not sacks — sacks crush up to a third of the load.' },
    ],
    seed: { item: 'Tomato seed (for the nursery)', perHa: 250, unit: 'g', note: 'Raise seedlings in a nursery for 4–5 weeks before transplanting at 75 × 50 cm.' },
    exampleBudget: { pricePerTon: 350_000, yieldTHa: 15, costs: costs(120_000, 300_000, 250_000, 100_000, 400_000, 300_000, 250_000) },
  },

  cassava: {
    id: 'cassava',
    name: 'Cassava',
    plantingLabel: 'Planting date (stem cuttings)',
    maturityDays: 300,
    faoStages: [30, 60, 150, 60],
    kc: { ini: 0.3, mid: 0.8, end: 0.3 },
    p: 0.35,
    rootDepthM: { min: 0.3, max: 1.0 },
    phRange: [4.5, 6.5],
    legume: false,
    humidDiseases: 'cassava anthracnose',
    stages: [
      { name: 'Sprouting', startDap: 0, note: 'Buds sprout in 1–2 weeks; replace cuttings that fail.' },
      { name: 'Establishment', startDap: 15, note: 'Fibrous roots spread. Weeds are the biggest threat for 3 months.' },
      { name: 'Canopy development', startDap: 60, note: 'The canopy closes and shades out weeds.' },
      { name: 'Root bulking', startDap: 120, note: 'Storage roots fill with starch.' },
      { name: 'Harvest-ready', startDap: 270, note: 'Can be harvested now or left in the ground for a few months.' },
    ],
    tasks: [
      { id: 'weed1', kind: 'weed', title: 'First weeding', fromDap: 21, toDap: 30, how: 'Around 3–4 weeks after planting.' },
      { id: 'npk', kind: 'fertilizer', dose: { product: 'NPK 15-15-15', kgPerHa: 400 }, title: 'Apply NPK 15-15-15', fromDap: 28, toDap: 56, needsMoistSoil: true,
        how: '8 bags (400 kg) per hectare in a ring about 10 cm from each plant.' },
      { id: 'weed2', kind: 'weed', title: 'Second weeding', fromDap: 56, toDap: 66, how: 'Around 8 weeks after planting.' },
      { id: 'cmd', kind: 'scout', title: 'Check for mosaic and brown streak disease', fromDap: 30, toDap: 120, repeatDays: 14,
        how: 'Uproot and burn plants with mottled, twisted leaves early, before whiteflies spread the virus.' },
      { id: 'weed3', kind: 'weed', title: 'Third weeding', fromDap: 84, toDap: 98, how: 'Around 12 weeks; after this the canopy suppresses weeds.' },
      { id: 'harvest', kind: 'harvest', title: 'Harvest window open', fromDap: 270, toDap: 360,
        how: 'Harvest in batches as you can sell or process — roots rot within 2–3 days of lifting.' },
    ],
    seed: { item: 'Cassava stems', perHa: 55, unit: 'bundles', note: 'Bundles of 50 stems, 1 m long; cut into 20–25 cm cuttings — about 10,000 per hectare at 1 × 1 m.' },
    exampleBudget: { pricePerTon: 120_000, yieldTHa: 15, costs: costs(80_000, 360_000, 60_000, 90_000, 250_000, 180_000, 120_000) },
  },
};

export const CROP_LIST: CropDef[] = Object.values(CROPS);

export const MATURITY_FACTOR: Record<Maturity, number> = { early: 0.85, medium: 1, late: 1.15 };

/** Returns a crop definition with all DAP values scaled for the variety's maturity. */
export function scaledCrop(id: CropId, maturity: Maturity): CropDef {
  const base = CROPS[id];
  const f = MATURITY_FACTOR[maturity];
  if (f === 1) return base;
  const s = (n: number) => Math.round(n * f);
  const fao = base.faoStages.map(s) as [number, number, number, number];
  return {
    ...base,
    maturityDays: fao.reduce((a, b) => a + b, 0),
    faoStages: fao,
    stages: base.stages.map((st) => ({ ...st, startDap: s(st.startDap) })),
    // Early field operations (basal fertilizer, first weeding) are tied to the
    // calendar more than to maturity, so only scale tasks after the first month.
    tasks: base.tasks.map((t) => (t.fromDap < 28 ? t : { ...t, fromDap: s(t.fromDap), toDap: s(t.toDap) })),
  };
}
