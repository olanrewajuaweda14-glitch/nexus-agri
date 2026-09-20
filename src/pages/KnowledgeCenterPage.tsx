import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Tag,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sprout,
  CloudSun,
  DollarSign,
  Globe2,
  Bookmark,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Farm, AppNavigationTab } from '../types';

interface KnowledgeCenterPageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export interface AgronomicArticle {
  id: string;
  title: string;
  category: 'Crop Management' | 'Soil Science' | 'Remote Sensing' | 'Finance & Economics' | 'Weather & Climate';
  readTimeMinutes: number;
  summary: string;
  sourceCitation: string;
  sourceOrg: string;
  keyTakeaways: string[];
  fullBody: string[];
  actionRecommendation: string;
  relatedModuleTab: AppNavigationTab;
  relatedModuleLabel: string;
}

export const KNOWLEDGE_ARTICLES: AgronomicArticle[] = [
  {
    id: 'art-spraying-timing',
    title: 'Optimal Atmospheric Spraying Windows to Prevent Droplet Drift & Evaporative Loss',
    category: 'Weather & Climate',
    readTimeMinutes: 5,
    summary: 'Why early morning passes (<10 km/h wind and relative humidity >60%) prevent up to 40% active ingredient waste.',
    sourceCitation: 'IITA Tropical Crop Protection Manual, Bulletin No. 44',
    sourceOrg: 'International Institute of Tropical Agriculture (IITA)',
    keyTakeaways: [
      'Wind speeds above 12 km/h induce horizontal droplet drift across parcel boundaries.',
      'Mid-day high ambient temperatures cause micro-droplets (<150 microns) to evaporate before contacting leaf stomata.',
      'Relative humidity between 65% and 85% maximizes foliar chemical absorption.',
    ],
    fullBody: [
      'Applying agricultural chemicals during midday heat is one of the most widespread economic losses in smallholder farming. High thermal updrafts cause fine droplets to volatilize into the atmosphere before ever settling onto target crop foliage.',
      'The ideal spraying window in the Guinea and Derived Savanna agro-ecological zones typically occurs between 06:30 AM and 09:30 AM. During this period, nighttime temperature inversions stabilize surface air layers, wind speeds fall below 8 km/h, and relative humidity remains elevated.',
      'NEXUS AGRI continuously monitors these atmospheric indicators using ECMWF hourly feeds to compute the optimal spray window for your active parcel.',
    ],
    actionRecommendation: 'Check your active farm spraying window before calibrating the tractor sprayer or knapsack crew.',
    relatedModuleTab: 'weather',
    relatedModuleLabel: 'View Hyperlocal Spraying Windows',
  },
  {
    id: 'art-soil-ph-phosphorus',
    title: 'Soil pH and Macronutrient Bioavailability: Preventing Phosphorus Fixation in Savanna Soils',
    category: 'Soil Science',
    readTimeMinutes: 6,
    summary: 'How soil acidity below pH 5.5 locks applied phosphorus into insoluble aluminum complexes.',
    sourceCitation: 'ISRIC World Soil Information / FAO Soils Portal (SoilGrids 250m Review)',
    sourceOrg: 'ISRIC - World Soil Information',
    keyTakeaways: [
      'At pH < 5.5, soluble phosphate anions precipitate with aluminum and iron cations.',
      'Optimal nutrient uptake occurs between pH 6.0 and 6.8.',
      'Agricultural lime (CaCO₃) or dolomitic limestone restores cation balance without scorching crops.',
    ],
    fullBody: [
      'Many farmers believe increasing chemical NPK application will compensate for stagnant yields. However, if soil pH is acidic (below 5.8), up to 70% of applied inorganic phosphorus remains chemically fixed and unavailable to roots.',
      'Calibrating soil tests between laboratory-verified samples and satellite estimates allows farmers to pinpoint whether low yields are driven by actual nutrient deficiency or chemical lockup.',
      'Maintaining soil pH between 6.2 and 6.6 ensures that applied fertilizer dissolves into the soil solution where root hair uptake can occur uninhibited.',
    ],
    actionRecommendation: 'Inspect your active farm soil pH and verify whether laboratory calibration is active.',
    relatedModuleTab: 'soil',
    relatedModuleLabel: 'Inspect Soil Chemistry & pH',
  },
  {
    id: 'art-sentinel2-biomass',
    title: 'Interpreting Normalized Difference Vegetation Index (NDVI) and NDWI in Tropical Cereals',
    category: 'Remote Sensing',
    readTimeMinutes: 7,
    summary: 'A practitioner guide to detecting canopy chlorosis and moisture deficits 7-10 days before visible field wilting.',
    sourceCitation: 'Copernicus Sentinel-2 User Handbook, European Space Agency (ESA)',
    sourceOrg: 'European Space Agency (ESA)',
    keyTakeaways: [
      'NDVI values between 0.70 and 0.85 indicate vigorous healthy vegetative biomass.',
      'NDWI (Normalized Difference Water Index) isolates leaf mesophyll hydration levels.',
      'Zone-level index anomalies pinpoint localized percolation variances or pest hot spots.',
    ],
    fullBody: [
      'Traditional visual inspection requires walking entire field perimeters, often discovering issues only after permanent cell damage has occurred. Multispectral satellite imagery captures reflectance in near-infrared (NIR) wavelengths that the human eye cannot perceive.',
      'Healthy plant leaves reflect strong NIR energy from spongy mesophyll tissue. When water stress or nitrogen chlorosis begins, NIR reflectance declines significantly while red light absorption drops.',
      'By analyzing Sentinel-2 10-meter resolution images every 5 days, NEXUS AGRI detects quadrant-specific biomass drops like the Block B-2 anomaly, allowing targeted spot interventions.',
    ],
    actionRecommendation: 'Review the satellite multispectral vegetation profile and anomaly zones for your farm.',
    relatedModuleTab: 'satellite',
    relatedModuleLabel: 'Explore Satellite Biomass Indices',
  },
  {
    id: 'art-pics-storage-arbitrage',
    title: 'Hermetic Grain Storage Economics: Capturing Seasonal Arbitrage with PICS Bags',
    category: 'Finance & Economics',
    readTimeMinutes: 5,
    summary: 'How investing ₦1,200 in Purdue Improved Crop Storage bags yields up to 45% return over 90 days.',
    sourceCitation: 'Purdue University Department of Agricultural Economics & AFEX Commodity Exchange Bulletin',
    sourceOrg: 'AFEX Commodities Exchange',
    keyTakeaways: [
      'Post-harvest market saturation depresses maize and grain prices by 25-35% in November/December.',
      'Hermetic storage eliminates insect infestation without chemical fumigants.',
      'Off-peak liquidation in March/April consistently generates positive net margins after storage costs.',
    ],
    fullBody: [
      'Smallholder farmers frequently sell their harvest immediately from the field gate because of immediate cash needs and fear of post-harvest weevil damage. This dumping creates an artificial seasonal glut that enriches intermediaries.',
      'Hermetic triple-layer polyethylene bags (such as PICS) suffocate insect pests naturally by depleting oxygen within 48 hours of sealing. Stored grain retains germination capacity and premium food-grade quality for over 12 months.',
      'By calculating your holding costs, interest rate, and wholesale terminal arbitrage, farmers can safely transition from price-takers to strategic commodity sellers.',
    ],
    actionRecommendation: 'Calculate your farm post-harvest holding ROI in the Market Intelligence module.',
    relatedModuleTab: 'markets',
    relatedModuleLabel: 'View Terminal Markets & Storage ROI',
  },
  {
    id: 'art-break-even-yield',
    title: 'Deterministic Farm Unit Economics: Calculating Break-Even Yield Prior to Planting',
    category: 'Finance & Economics',
    readTimeMinutes: 6,
    summary: 'The mathematical arithmetic required to ensure operational revenue exceeds fixed and variable crop investments.',
    sourceCitation: 'African Development Bank (AfDB) Agribusiness Investment Handbook',
    sourceOrg: 'African Development Bank (AfDB)',
    keyTakeaways: [
      'Break-even yield = Total Input & Operating Costs / Net Realized Price per Ton.',
      'Separating fixed land preparation from variable foliar treatments protects cash flow.',
      'Target yields must exceed break-even by at least 40% to absorb climate and price volatility.',
    ],
    fullBody: [
      'Farming is a commercial enterprise requiring disciplined capital accounting. Many operations fail not because of poor agronomy, but because total operating expenditures were incurred without calculating the required minimum harvest volume.',
      'By itemizing all 9 input factors (seed, fertilizer, crop protection, mechanization, irrigation, labor, transport, storage, and contingency), the farmer establishes an unassailable financial hurdle rate.',
      'If your active farm requires 1.08 tons/hectare to break even and your historical parcel average is 3.8 tons/hectare, your operating safety margin is a robust 71%.',
    ],
    actionRecommendation: 'Audit all 9 cost factors and view your break-even sensitivity matrix.',
    relatedModuleTab: 'economics',
    relatedModuleLabel: 'Open Farm Economics Calculator',
  },
  {
    id: 'art-soybean-maize-rotation',
    title: 'Biological Nitrogen Fixation: The Economic Rationale for Maize-Soybean Rotations',
    category: 'Crop Management',
    readTimeMinutes: 5,
    summary: 'How rotating with nodulating legumes can reduce synthetic nitrogen fertilizer requirements by 30-40 kg N/ha.',
    sourceCitation: 'IITA Legume Agronomy Division Research Paper Series',
    sourceOrg: 'International Institute of Tropical Agriculture (IITA)',
    keyTakeaways: [
      'Rhizobium bacteria in legume root nodules convert atmospheric N₂ into bioavailable ammonium.',
      'Continuous cereal monoculture depletes topsoil organic matter and promotes Striga weed seed germination.',
      'Soybean residues decompose rapidly, enriching subsequent cereal crops with organic nitrogen.',
    ],
    fullBody: [
      'Synthetic nitrogen fertilizer prices remain volatile due to global natural gas feedstock costs and currency fluctuations. Continuously planting nitrogen-hungry crops like maize depletes indigenous soil fertility.',
      'Inoculating soybean seed with Bradyrhizobium japonicum stimulates profuse root nodulation capable of fixing over 80 kg of atmospheric nitrogen per hectare per season.',
      'After grain harvest, decaying soybean root nodules and leaf litter leave a biological nitrogen credit in the soil, reducing the synthetic Urea required for the following season maize crop by up to 35%.',
    ],
    actionRecommendation: 'Compare soybean economics and agronomic suitability against your active crop.',
    relatedModuleTab: 'crop-advisor',
    relatedModuleLabel: 'Compare Crops in Crop Advisor',
  },
];

export const KnowledgeCenterPage: React.FC<KnowledgeCenterPageProps> = ({
  activeFarm,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedArticle, setSelectedArticle] = useState<AgronomicArticle | null>(null);

  const categories = ['All', 'Weather & Climate', 'Soil Science', 'Remote Sensing', 'Finance & Economics', 'Crop Management'];

  const filteredArticles = useMemo(() => {
    return KNOWLEDGE_ARTICLES.filter((art) => {
      const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
      const matchesQuery =
        searchQuery.trim() === '' ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.sourceOrg.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Agronomic Intelligence &amp; Science Library
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">Verified African Agricultural Research</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            <span>Knowledge Center &amp; Agronomic Protocols</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Practical guides and peer-reviewed research from IITA, FAO, ISRIC, and ESA translated into
            executable actions for {activeFarm.name}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('ai-advisor')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask AI Agronomist</span>
        </button>
      </div>

      {/* Search Bar & Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agronomic research, soil pH guidelines, Sentinel-2 indices, hermetic storage..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((art) => (
          <div
            key={art.id}
            className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-emerald-400 border border-neutral-700">
                  {art.category}
                </span>
                <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{art.readTimeMinutes} min read</span>
                </span>
              </div>

              <h3 className="text-sm font-bold text-neutral-100 group-hover:text-emerald-400 transition-colors line-clamp-2">
                {art.title}
              </h3>

              <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                {art.summary}
              </p>

              <div className="pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-500 block truncate">
                  Source: {art.sourceOrg}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedArticle(art)}
                className="text-xs text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Read Full Article</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate(art.relatedModuleTab)}
                className="text-[11px] text-neutral-400 hover:text-white underline"
                title={`Open ${art.relatedModuleLabel}`}
              >
                Apply to Farm
              </button>
            </div>
          </div>
        ))}

        {filteredArticles.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <BookOpen className="w-8 h-8 text-neutral-600 mx-auto" />
            <h4 className="text-sm font-bold text-neutral-300">No articles matched your search</h4>
            <p className="text-xs text-neutral-500">Try changing your search terms or selecting 'All' categories.</p>
          </div>
        )}
      </div>

      {/* Full Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-800 flex items-start justify-between gap-4 bg-neutral-950/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {selectedArticle.category}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {selectedArticle.readTimeMinutes} min read
                  </span>
                </div>
                <h2 className="text-lg font-bold text-neutral-100">
                  {selectedArticle.title}
                </h2>
                <span className="text-xs font-mono text-neutral-400 block">
                  Citation: {selectedArticle.sourceCitation}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {/* Key Takeaways Box */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Key Agronomic Takeaways:
                </span>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {selectedArticle.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full Text Paragraphs */}
              <div className="space-y-3">
                {selectedArticle.fullBody.map((paragraph, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Action Recommendation */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Recommended Action for {activeFarm.name}:
                  </span>
                </div>
                <p className="text-xs text-neutral-200">
                  {selectedArticle.actionRecommendation}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                Verified against {selectedArticle.sourceOrg} standards
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 font-semibold text-xs hover:bg-neutral-700"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedArticle.relatedModuleTab;
                    setSelectedArticle(null);
                    onNavigate(target);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                >
                  <span>{selectedArticle.relatedModuleLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
