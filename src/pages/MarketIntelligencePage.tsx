import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calendar,
  Store,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  Truck,
  Info,
} from 'lucide-react';
import { CommodityPrice, Farm, AppNavigationTab } from '../types';
import { MarketService } from '../services/marketService';
import { DataTrustBadge } from '../components/common/DataTrustBadge';

interface MarketIntelligencePageProps {
  activeFarm: Farm;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const MarketIntelligencePage: React.FC<MarketIntelligencePageProps> = ({
  activeFarm,
  onNavigate,
}) => {
  const commodities = useMemo(() => MarketService.getCommodities(), []);
  const [selectedCrop, setSelectedCrop] = useState<CommodityPrice>(commodities[0]);

  // Interactive Storage vs Immediate Sell State
  const [storageMonths, setStorageMonths] = useState<number>(2);
  const [tonnageToStore, setTonnageToStore] = useState<number>(15);

  const storageArbitrage = useMemo(() => {
    return MarketService.calculateStorageArbitrage(
      selectedCrop.pricePerKg,
      tonnageToStore,
      storageMonths
    );
  }, [selectedCrop, tonnageToStore, storageMonths]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Commodity Exchange &amp; Wholesale Terminals
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">Regional Terminal: Bodija Hub, Oyo State</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>Market Intelligence &amp; Off-Take Pricing</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Regional benchmark commodity prices, inter-market destination arbitrage, buyer demand ratings, and storage
            payoff calculations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('simulator')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulate Price Sensitivity</span>
        </button>
      </div>

      {/* Strategic Off-Take Advisory Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-neutral-900 to-neutral-900 border border-emerald-500/30 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              OFF-TAKE TIMING RECOMMENDATION
            </span>
            <span className="text-xs font-bold text-neutral-200">Active Crop: {activeFarm.currentCrop}</span>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Next Harvest Window: ~48 Days
          </span>
        </div>

        <h3 className="text-base font-bold text-neutral-100">
          Hold Maize grain for 45&ndash;60 days post-harvest in sealed hermetic storage rather than spot liquidating
          at field gate.
        </h3>
        <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
          <strong>Economic Rationale:</strong> Regional procurement by poultry feed millers intensifies in late
          Q4. Historical seasonal curves over 5 years show an average 18.5% price premium over immediate harvest-glut
          rates. Storage costs in PICS bags are ₦12/kg vs an anticipated ₦85/kg price expansion.
        </p>
      </div>

      {/* Commodity Price Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {commodities.map((commodity: CommodityPrice) => {
          const isSelected = selectedCrop.id === commodity.id;
          const isUp = commodity.changePercent7d > 0;
          const isDown = commodity.changePercent7d < 0;

          return (
            <div
              key={commodity.id}
              onClick={() => setSelectedCrop(commodity)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-neutral-900 border-emerald-500/60 shadow-xl shadow-emerald-950/20'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-base font-bold text-neutral-100">{commodity.name}</h3>
                    <span className="text-xs text-neutral-500">{commodity.unit} &bull; {commodity.market}</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-xs font-bold">
                    {isUp ? (
                      <span className="flex items-center gap-0.5 text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" /> +{commodity.changePercent7d}%
                      </span>
                    ) : isDown ? (
                      <span className="flex items-center gap-0.5 text-rose-400">
                        <TrendingDown className="w-3.5 h-3.5" /> {commodity.changePercent7d}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-neutral-400">
                        <Minus className="w-3.5 h-3.5" /> 0.0%
                      </span>
                    )}
                  </div>
                </div>

                <div className="my-3">
                  <span className="text-2xl font-bold font-mono text-neutral-100">
                    ₦{commodity.pricePerKg} <span className="text-xs font-normal text-neutral-500">/ kg</span>
                  </span>
                  <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                    Wholesale: ₦{(commodity.pricePerKg * 1000).toLocaleString()} / metric ton
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Buyer Demand:</span>
                    <strong className="text-emerald-400">{commodity.demandRating}</strong>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-neutral-500">Retail Markup:</span>
                    <span className="text-neutral-300 font-mono">₦{commodity.retailPricePerKg} / kg</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                <span className="text-neutral-500 text-[11px] font-mono">
                  Benchmark: {commodity.lastUpdated}
                </span>
                <span className="text-emerald-400 font-semibold">
                  Select for Arbitrage &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Storage vs Immediate Sell Decision Simulator */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-neutral-100">
                Storage vs. Immediate Fieldgate Sell Payoff Engine
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Evaluating hermetic PICS bag storage arbitrage for {selectedCrop.name} across 1 to 6 months post-harvest.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            Selected: {selectedCrop.name} (₦{selectedCrop.pricePerKg}/kg)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-neutral-300 font-semibold">Quantity to Store</label>
                <span className="font-mono text-emerald-400">{tonnageToStore} Metric Tons</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="1"
                value={tonnageToStore}
                onChange={(e) => setTonnageToStore(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-neutral-300 font-semibold">Planned Storage Duration</label>
                <span className="font-mono text-emerald-400">{storageMonths} Months ({storageMonths * 30} Days)</span>
              </div>
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={storageMonths}
                onChange={(e) => setStorageMonths(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-[11px] text-neutral-400">
              <div className="flex justify-between">
                <span>Immediate Fieldgate Value:</span>
                <span className="font-mono text-neutral-200">₦{storageArbitrage.immediateRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Projected Stored Value:</span>
                <span className="font-mono text-emerald-400">₦{storageArbitrage.projectedStoredRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Bagging &amp; Warehousing Cost:</span>
                <span className="font-mono text-neutral-300">₦{storageArbitrage.storageCosts.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Outcome & Recommendation (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="p-4 rounded-xl bg-neutral-950 border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200">Net Arbitrage Payoff:</span>
                <span className={`text-xl font-mono font-bold ${
                  storageArbitrage.netGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {storageArbitrage.netGain >= 0 ? '+' : ''}₦{storageArbitrage.netGain.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-800 text-[11.5px] text-neutral-300 space-y-1">
                <strong className="text-emerald-400 block font-semibold">
                  Strategic Advice: {storageArbitrage.recommendation}
                </strong>
                <p className="text-neutral-400 text-xs">
                  Expected off-season price appreciation reaches approximately ₦{storageArbitrage.projectedFuturePricePerKg}/kg, yielding a {storageArbitrage.gainPercent}% gross payoff over harvest gluts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regional Arbitrage & Market Terminal Comparison */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <span>Multi-Hub Destination Haulage Arbitrage &mdash; {selectedCrop.name}</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Comparing farmgate value against major commercial hubs taking into account diesel transit costs.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Regional Spreads
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-100">Bodija Market (Local)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                Ibadan, Oyo
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-neutral-100">₦{selectedCrop.pricePerKg} / kg</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Transport cost: ₦8/kg. Zero intermediate haulage risk. Recommended for immediate liquidity.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-100">Mile 12 Terminal</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                Lagos State
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-400">
              ₦{Math.round(selectedCrop.pricePerKg * 1.15)} / kg
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Premium: +15%. Haulage transit to Lagos: ₦22/kg. Net arbitrage margin is favorable for loads &gt; 10 tons.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-100">Dawanau Grain Market</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                Kano State
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-neutral-300">
              ₦{Math.round(selectedCrop.pricePerKg * 0.94)} / kg
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Northern production surplus center. Lower wholesale base; not recommended for outbound shipment.
            </p>
          </div>
        </div>
      </div>

      {/* Data Trust Badge */}
      <DataTrustBadge
        sourceName="AFEX Commodity Exchange + National Agricultural Extension Research Liaison (NAERLS) + Bodija Grain Traders Association"
        sourceType="market_exchange"
        confidenceScore={92}
        lastUpdated="Regional Benchmark Cash Session (2026-09-19 09:30 WAT)"
        assumptions={[
          'Wholesale prices calibrated for standard moisture grain (<13.5% dry matter).',
          'Data represents regional wholesale benchmarks, not live exchange ticker trades.',
        ]}
      />
    </div>
  );
};
