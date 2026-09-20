import React, { useState } from 'react';
import {
  Search,
  Bell,
  Mic,
  Sun,
  Moon,
  Sparkles,
  MapPin,
  ChevronDown,
  Plus,
  Play,
  Check,
  Shield,
  Menu,
  LogOut,
  User as UserIcon,
  LogIn,
  Cpu,
} from 'lucide-react';
import { Farm, AlertNotification, AppNavigationTab } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  farms: Farm[];
  activeFarm: Farm;
  onSelectFarm: (farm: Farm) => void;
  onOpenAddFarm?: () => void;
  onOpenOnboarding?: () => void;
  onOpenSearch?: () => void;
  onOpenVoice?: () => void;
  onOpenDemoStory?: () => void;
  onOpenStoryTour?: () => void;
  onOpenDecisionSynthesis?: () => void;
  alerts?: AlertNotification[];
  unreadAlertsCount?: number;
  onNavigateAlerts?: () => void;
  onNavigate?: (tab: AppNavigationTab) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onToggleSidebar?: () => void;
  judgeMode?: boolean;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  farms,
  activeFarm,
  onSelectFarm,
  onOpenAddFarm,
  onOpenOnboarding,
  onOpenSearch = () => {},
  onOpenVoice = () => {},
  onOpenDemoStory,
  onOpenStoryTour,
  onOpenDecisionSynthesis = () => {},
  alerts = [],
  unreadAlertsCount: propUnreadAlertsCount,
  onNavigateAlerts,
  onNavigate = () => {},
  theme = 'dark',
  onToggleTheme = () => {},
  onToggleSidebar,
  judgeMode = false,
  isOnline = true,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const handleOpenAdd = onOpenOnboarding || onOpenAddFarm || (() => {});
  const handleOpenDemo = onOpenStoryTour || onOpenDemoStory || (() => {});
  const [showFarmMenu, setShowFarmMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadAlertsCount = propUnreadAlertsCount !== undefined ? propUnreadAlertsCount : alerts.filter((a) => !a.read).length;

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'NA';

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left section: Mobile menu toggle + Farm Selector */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 focus:outline-none"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Farm Selector dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowFarmMenu(!showFarmMenu);
              setShowAlertsMenu(false);
              setShowUserMenu(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs sm:text-sm font-medium text-neutral-200 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <MapPin className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            <span className="font-semibold text-neutral-100 truncate max-w-[150px] sm:max-w-[200px]">
              {activeFarm.name}
            </span>
            <span className="text-neutral-400 text-xs hidden md:inline">
              ({activeFarm.sizeHa} ha)
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
          </button>

          {showFarmMenu && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                <span>Select Active Farm</span>
                <span className="text-neutral-400">{farms.length} Total</span>
              </div>

              <div className="space-y-1 mt-1">
                {farms.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onSelectFarm(f);
                      setShowFarmMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                      activeFarm.id === f.id
                        ? 'bg-emerald-600/20 text-emerald-400 font-semibold border border-emerald-500/30'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-neutral-100">{f.name}</div>
                      <div className="text-[11px] text-neutral-400">
                        {f.currentCrop} &bull; {f.sizeHa} ha &bull; {f.location}
                      </div>
                    </div>
                    {activeFarm.id === f.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="pt-2 mt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowFarmMenu(false);
                    handleOpenAdd();
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Farm</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {judgeMode && (
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Shield className="w-3 h-3" />
            JUDGE PRESENTATION MODE
          </span>
        )}
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Signature Decision Synthesis WOW Action */}
        <button
          type="button"
          onClick={onOpenDecisionSynthesis}
          className="hidden md:flex px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold items-center gap-1.5 shadow-sm transition-all"
          title="Synthesize 7 Multimodal Agricultural Streams into Decisive Actions"
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Synthesize Decision</span>
        </button>

        {/* Signature Story Tour Button */}
        <button
          type="button"
          onClick={handleOpenDemo}
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all hover:scale-102"
          title="Guided Interactive Agricultural Intelligence Demonstration"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">Show Me How NEXUS Works</span>
          <span className="sm:hidden">Demo</span>
        </button>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Search farms, crops, alerts, knowledge (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-neutral-900 text-[10px] font-mono border border-neutral-700 text-neutral-400">
            ⌘K
          </kbd>
        </button>

        {/* Voice AI Button */}
        <button
          type="button"
          onClick={onOpenVoice}
          className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-emerald-400 hover:text-emerald-300 transition-colors relative"
          title="Voice AI Assistant"
        >
          <Mic className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
        </button>

        {/* Notifications / Alerts Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowAlertsMenu(!showAlertsMenu);
              setShowFarmMenu(false);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors relative"
            title="Alerts and Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-[10px] font-bold text-neutral-950 font-mono">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          {showAlertsMenu && (
            <div className="absolute right-0 mt-1.5 w-80 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-100">Agricultural Alerts</span>
                <span className="text-[11px] text-amber-400 font-mono font-semibold">
                  {unreadAlertsCount} unread
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1.5 py-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      setShowAlertsMenu(false);
                      onNavigate('alerts');
                    }}
                    className="p-2.5 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/70 border border-neutral-800/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-neutral-200 capitalize">
                        {alert.type} Alert
                      </span>
                      <span className="text-neutral-400 font-mono">{alert.timestamp}</span>
                    </div>
                    <p className="text-xs text-neutral-300 font-medium line-clamp-1">{alert.title}</p>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">{alert.message}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAlertsMenu(false);
                    onNavigate('alerts');
                  }}
                  className="w-full py-1.5 text-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  View All Alerts Center &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-300 hover:text-white transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
        </button>

        {/* User profile dropdown & sign in */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowFarmMenu(false);
                setShowAlertsMenu(false);
              }}
              className="flex items-center gap-2 pl-1.5 text-left group focus:outline-none"
              title="Account Options"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-xs group-hover:border-emerald-400 transition-colors">
                {userInitials}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-2.5 z-50">
                <div className="px-2 py-1.5 border-b border-neutral-800 pb-2 mb-1.5">
                  <div className="font-bold text-xs text-white truncate">{user.name}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{user.email}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    {user.role} {user.organization ? `• ${user.organization}` : ''}
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenDecisionSynthesis();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors font-medium"
                  >
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Synthesize Farm Decision</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setShowUserMenu(false);
                      await logout();
                      onNavigate('login');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
