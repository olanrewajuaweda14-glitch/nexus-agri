import React, { useState, useEffect } from 'react';
import { Search, X, Sprout, Trees, Bell, BookOpen, FileText, ArrowRight } from 'lucide-react';
import { Farm, CropData, AppNavigationTab } from '../../types';
import { CROPS_DATABASE, KNOWLEDGE_ARTICLES } from '../../data/mockData';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: Farm[];
  onSelectFarm: (farm: Farm) => void;
  onNavigate: (tab: AppNavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  farms,
  onSelectFarm,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  // Keyboard shortcut support (ESC to close, Cmd+K already handled at root)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFarms = farms.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.location.toLowerCase().includes(query.toLowerCase()) ||
      f.currentCrop.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCrops = CROPS_DATABASE.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.scientificName.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredArticles = KNOWLEDGE_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase()) ||
      a.summary.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden">
        {/* Search Input Box */}
        <div className="p-4 border-b border-neutral-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across farms, crop recommendations, alerts, reports..."
            autoFocus
            className="w-full bg-transparent text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-neutral-400 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Actions if query is empty */}
          {!query && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 block mb-1.5">
                Quick Navigation
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {[
                  { label: 'Farm Overview', tab: 'overview' },
                  { label: 'Crop Advisor', tab: 'crop-advisor' },
                  { label: 'Weather Forecast', tab: 'weather' },
                  { label: 'Soil Intelligence', tab: 'soil' },
                  { label: 'Satellite Monitor', tab: 'satellite' },
                  { label: 'What-If Simulator', tab: 'simulator' },
                ].map((item) => (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => {
                      onNavigate(item.tab as AppNavigationTab);
                      onClose();
                    }}
                    className="p-2.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-800 text-left text-neutral-300 hover:text-emerald-400 flex items-center justify-between transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Farms */}
          {filteredFarms.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 block mb-1.5">
                Farms ({filteredFarms.length})
              </span>
              <div className="space-y-1">
                {filteredFarms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onSelectFarm(f);
                      onNavigate('overview');
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-800/80 text-left flex items-center justify-between text-neutral-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trees className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-100">{f.name}</div>
                        <div className="text-[11px] text-neutral-400">
                          {f.currentCrop} &bull; {f.sizeHa} ha &bull; {f.location}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">Select Farm &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Crops */}
          {filteredCrops.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 block mb-1.5">
                Crops Database ({filteredCrops.length})
              </span>
              <div className="space-y-1">
                {filteredCrops.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onNavigate('crop-advisor');
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-800/80 text-left flex items-center justify-between text-neutral-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-100">
                          {c.name} <span className="text-neutral-400 font-normal italic">({c.scientificName})</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          Suitability: {c.suitabilityScore}% &bull; Yield: {c.typicalYieldTonsPerHa.avg} t/ha &bull; Margin: {c.projectedMarginPercent}%
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400">View Crop &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Articles */}
          {filteredArticles.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 block mb-1.5">
                Knowledge Articles ({filteredArticles.length})
              </span>
              <div className="space-y-1">
                {filteredArticles.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      onNavigate('knowledge');
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/80 border border-neutral-800/80 text-left flex items-center justify-between text-neutral-300 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-neutral-100">{a.title}</div>
                        <div className="text-[11px] text-neutral-400">{a.category} &bull; {a.readingTime}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-sky-400">Read &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && filteredFarms.length === 0 && filteredCrops.length === 0 && filteredArticles.length === 0 && (
            <div className="py-8 text-center text-neutral-400">
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-neutral-500 mt-1">
                Try searching for crops like &ldquo;Maize&rdquo; or &ldquo;Soybean&rdquo;, or farm locations like &ldquo;Ibadan&rdquo;.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-neutral-800 bg-neutral-950 text-[11px] text-neutral-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>Navigation: Click or Enter</span>
            <span>Close: ESC</span>
          </div>
          <span className="text-emerald-400 font-mono">NEXUS Fast Index</span>
        </div>
      </div>
    </div>
  );
};
