import React from 'react';
import {
  LayoutDashboard,
  Trees,
  Cpu,
  Sprout,
  CloudSun,
  Layers,
  Satellite,
  Activity,
  Camera,
  TrendingUp,
  DollarSign,
  Calculator,
  GitCompare,
  AlertTriangle,
  Bot,
  Bell,
  FileText,
  BookOpen,
  Settings,
  Sparkles,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';
import { AppNavigationTab } from '../../types';

interface SidebarProps {
  activeTab: AppNavigationTab;
  onNavigate?: (tab: AppNavigationTab) => void;
  onSelectTab?: (tab: AppNavigationTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  unreadAlertsCount?: number;
}

interface NavGroup {
  groupLabel: string;
  items: {
    id: AppNavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
  unreadAlertsCount = 0,
}) => {
  const handleNav = (tab: AppNavigationTab) => {
    if (onSelectTab) onSelectTab(tab);
    else if (onNavigate) onNavigate(tab);
  };
  const navGroups: NavGroup[] = [
    {
      groupLabel: 'Command',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'my-farms', label: 'My Farms', icon: Trees },
        { id: 'farm-intelligence', label: 'Farm Intelligence', icon: Cpu, badge: 'Score 82' },
      ],
    },
    {
      groupLabel: 'Agronomics & Earth',
      items: [
        { id: 'crop-advisor', label: 'Crop Advisor', icon: Sprout },
        { id: 'weather', label: 'Weather Intelligence', icon: CloudSun },
        { id: 'soil', label: 'Soil Intelligence', icon: Layers },
        { id: 'satellite', label: 'Satellite Monitor', icon: Satellite },
        { id: 'farm-health', label: 'Farm Health', icon: Activity },
        { id: 'photo-analysis', label: 'Analyze Crop Photo', icon: Camera, badge: 'AI Vision' },
      ],
    },
    {
      groupLabel: 'Markets & Decision',
      items: [
        { id: 'markets', label: 'Market Intelligence', icon: TrendingUp },
        { id: 'economics', label: 'Farm Economics', icon: DollarSign },
        { id: 'simulator', label: 'Scenario Simulator', icon: GitCompare, badge: 'What-If?' },
        { id: 'risk', label: 'Risk Center', icon: AlertTriangle },
      ],
    },
    {
      groupLabel: 'Intelligence & Output',
      items: [
        { id: 'ai-advisor', label: 'Ask NEXUS', icon: Bot, badge: 'AI' },
        { id: 'alerts', label: 'Alerts Center', icon: Bell, badge: unreadAlertsCount > 0 ? `${unreadAlertsCount}` : undefined },
        { id: 'reports', label: 'Farm Reports', icon: FileText },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
      ],
    },
    {
      groupLabel: 'Platform',
      items: [
        { id: 'landing', label: 'Product Landing', icon: Home },
        { id: 'settings', label: 'Settings & Judge Mode', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col justify-between border-r border-neutral-800 bg-neutral-950 transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 border-b border-neutral-800 flex items-center justify-between">
          {!collapsed ? (
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => handleNav('overview')}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold shadow-md shadow-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-extrabold tracking-tight text-neutral-100 text-sm block leading-none">
                  NEXUS <span className="text-emerald-400">AGRI</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block mt-0.5">
                  Intelligence Engine
                </span>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 cursor-pointer"
              onClick={() => handleNav('overview')}
              title="NEXUS AGRI"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Scrollable Navigation Items */}
        <div className="py-3 px-2 overflow-y-auto max-h-[calc(100vh-125px)] space-y-4 text-xs">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!collapsed && (
                <div className="px-2.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neutral-400">
                  {group.groupLabel}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors group relative ${
                        isActive
                          ? 'bg-emerald-600/20 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-emerald-400' : 'text-neutral-400 group-hover:text-neutral-200'
                        }`}
                      />

                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between text-left truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                                isActive
                                  ? 'bg-emerald-500/30 text-emerald-200'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Dot for active state when collapsed */}
                      {collapsed && isActive && (
                        <span className="absolute right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/80">
        {!collapsed ? (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-neutral-300 font-medium block leading-none">Live Sync</span>
                <span className="text-[10px] text-neutral-400 font-mono">10m Sentinel-2 / AWS</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-neutral-400">v1.2</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Live Sync: Online">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
