import React, { useState } from 'react';
import {
  LayoutDashboard,
  Trees,
  Bot,
  Bell,
  MoreHorizontal,
  CloudSun,
  Layers,
  Satellite,
  DollarSign,
  GitCompare,
  Camera,
  FileText,
  X,
  Settings,
} from 'lucide-react';
import { AppNavigationTab } from '../../types';

interface MobileNavProps {
  activeTab: AppNavigationTab;
  onNavigate?: (tab: AppNavigationTab) => void;
  onSelectTab?: (tab: AppNavigationTab) => void;
  unreadAlertsCount?: number;
  onOpenVoice?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onNavigate,
  onSelectTab,
  unreadAlertsCount = 0,
  onOpenVoice,
}) => {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const handleNav = (tab: AppNavigationTab) => {
    if (onSelectTab) onSelectTab(tab);
    else if (onNavigate) onNavigate(tab);
  };

  const mainTabs: { id: AppNavigationTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'my-farms', label: 'Farms', icon: Trees },
    { id: 'ai-advisor', label: 'Ask AI', icon: Bot, badge: 'AI' },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined },
  ];

  const drawerTabs: { id: AppNavigationTab; label: string; icon: React.ElementType }[] = [
    { id: 'crop-advisor', label: 'Crop Advisor', icon: Trees },
    { id: 'weather', label: 'Weather', icon: CloudSun },
    { id: 'soil', label: 'Soil Intelligence', icon: Layers },
    { id: 'satellite', label: 'Satellite Monitor', icon: Satellite },
    { id: 'photo-analysis', label: 'Analyze Photo', icon: Camera },
    { id: 'economics', label: 'Farm Economics', icon: DollarSign },
    { id: 'simulator', label: 'What-If Simulator', icon: GitCompare },
    { id: 'reports', label: 'Farm Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Bottom Sticky Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-3 flex items-center justify-around">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleNav(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[11px] relative transition-colors ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="absolute top-0 right-1 px-1 py-0.2 rounded-full bg-amber-500 text-[9px] font-bold text-neutral-950 font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={() => setShowMoreDrawer(!showMoreDrawer)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[11px] transition-colors ${
            showMoreDrawer ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Drawer Overlay for secondary mobile navigation */}
      {showMoreDrawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="bg-neutral-900 border-t border-neutral-800 rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <span className="text-sm font-bold text-neutral-200">All Agricultural Modules</span>
              <button
                type="button"
                onClick={() => setShowMoreDrawer(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-4 pb-6">
              {drawerTabs.map((d) => {
                const Icon = d.icon;
                const isActive = activeTab === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      handleNav(d.id);
                      setShowMoreDrawer(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isActive
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-semibold'
                        : 'bg-neutral-800/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5 text-emerald-400" />
                    <span className="text-xs leading-tight">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
