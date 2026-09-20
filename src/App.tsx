import React, { useState, useEffect } from 'react';
import {
  Farm,
  AppNavigationTab,
  WeatherData,
  AlertNotification,
} from './types';
import {
  MOCK_FARMS,
  MOCK_WEATHER,
  MOCK_ALERTS,
} from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';

// Common Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileNav } from './components/common/MobileNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { VoiceAIModal } from './components/common/VoiceAIModal';
import { DemoStoryWalkthrough } from './components/common/DemoStoryWalkthrough';
import { JudgePresentationBar } from './components/common/JudgePresentationBar';
import { DecisionSynthesisModal } from './components/common/DecisionSynthesisModal';
import { FirstSessionModal } from './components/common/FirstSessionModal';

// Pages
import { OnboardingModal } from './pages/OnboardingModal';
import { OnboardingPage } from './pages/OnboardingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { MyFarmsPage } from './pages/MyFarmsPage';
import { FarmIntelligencePage } from './pages/FarmIntelligencePage';
import { CropAdvisorPage } from './pages/CropAdvisorPage';
import { WeatherPage } from './pages/WeatherPage';
import { SoilPage } from './pages/SoilPage';
import { SatellitePage } from './pages/SatellitePage';
import { FarmHealthPage } from './pages/FarmHealthPage';
import { PhotoAnalysisPage } from './pages/PhotoAnalysisPage';
import { MarketIntelligencePage } from './pages/MarketIntelligencePage';
import { FarmEconomicsPage } from './pages/FarmEconomicsPage';
import { ScenarioSimulatorPage } from './pages/ScenarioSimulatorPage';
import { RiskCenterPage } from './pages/RiskCenterPage';
import { AiAdvisorPage } from './pages/AiAdvisorPage';
import { AlertsCenterPage } from './pages/AlertsCenterPage';
import { FarmReportsPage } from './pages/FarmReportsPage';
import { KnowledgeCenterPage } from './pages/KnowledgeCenterPage';
import { SettingsPage } from './pages/SettingsPage';
import { LandingPage } from './pages/LandingPage';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, quickDemoLogin } = useAuth();

  // Navigation State with URL Hash Synchronization & Direct Access
  const getInitialTab = (): AppNavigationTab => {
    try {
      const hash = window.location.hash.replace('#', '').trim();
      const validTabs: string[] = [
        'overview', 'my-farms', 'farm-intelligence', 'intelligence', 'crop-advisor',
        'crops', 'weather', 'soil', 'satellite', 'farm-health', 'photo-analysis',
        'markets', 'market', 'economics', 'simulator', 'risk', 'risks', 'ai-advisor',
        'alerts', 'reports', 'knowledge', 'settings', 'landing', 'login', 'signup',
        'forgot-password', 'onboarding'
      ];
      if (hash && validTabs.includes(hash)) {
        return hash as AppNavigationTab;
      }
    } catch {
      // fallback
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<AppNavigationTab>(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync state with URL hash and support browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== activeTab) {
        setActiveTab(hash as AppNavigationTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [activeTab]);

  useEffect(() => {
    if (window.location.hash.replace('#', '') !== activeTab) {
      window.location.hash = activeTab;
    }
  }, [activeTab]);

  // Judge Presentation Mode
  const [judgeMode, setJudgeMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nexus_judge_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Farms State
  const [farms, setFarms] = useState<Farm[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_farms_cache');
      return saved ? JSON.parse(saved) : MOCK_FARMS;
    } catch {
      return MOCK_FARMS;
    }
  });

  const [activeFarmId, setActiveFarmId] = useState<string>(() => {
    return farms[0]?.id || MOCK_FARMS[0].id;
  });

  // Weather & Alerts
  const [weather] = useState<WeatherData>(MOCK_WEATHER);
  const [alerts, setAlerts] = useState<AlertNotification[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_alerts_cache');
      return saved ? JSON.parse(saved) : MOCK_ALERTS;
    } catch {
      return MOCK_ALERTS;
    }
  });

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isStoryTourOpen, setIsStoryTourOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [showFirstSession, setShowFirstSession] = useState(false);

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Persist farms to local storage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_farms_cache', JSON.stringify(farms));
    } catch (e) {
      console.warn('Failed to cache farms to localStorage', e);
    }
  }, [farms]);

  // Persist alerts to local storage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_alerts_cache', JSON.stringify(alerts));
    } catch (e) {
      console.warn('Failed to cache alerts to localStorage', e);
    }
  }, [alerts]);

  // Persist judge mode
  useEffect(() => {
    try {
      localStorage.setItem('nexus_judge_mode', judgeMode ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to cache judge mode', e);
    }
  }, [judgeMode]);

  const activeFarm = farms.find((f) => f.id === activeFarmId) || farms[0] || MOCK_FARMS[0];

  // Alert Actions
  const handleMarkAlertRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  const handleMarkAllAlertsRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  // Farm Actions
  const handleAddFarm = (newFarm: Farm) => {
    setFarms((prev) => [newFarm, ...prev]);
    setActiveFarmId(newFarm.id);
  };

  const handleUpdateFarm = (updatedFarm: Farm) => {
    setFarms((prev) => prev.map((f) => (f.id === updatedFarm.id ? updatedFarm : f)));
  };

  const handleDeleteFarm = (id: string) => {
    setFarms((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (activeFarmId === id && filtered.length > 0) {
        setActiveFarmId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleResetDemoData = () => {
    setFarms(MOCK_FARMS);
    setActiveFarmId(MOCK_FARMS[0].id);
    setAlerts(MOCK_ALERTS);
    try {
      localStorage.removeItem('nexus_farms_cache');
      localStorage.removeItem('nexus_alerts_cache');
    } catch (e) {
      console.warn('Failed to reset localStorage', e);
    }
  };

  const handleToggleJudgeMode = () => {
    setJudgeMode((prev) => !prev);
  };

  const handleUpdateSoilSource = (source: 'laboratory' | 'geospatial_estimate') => {
    setFarms((prev) =>
      prev.map((f) =>
        f.id === activeFarm.id
          ? {
              ...f,
              soil: {
                ...f.soil,
                source,
                labConfidenceScore: source === 'laboratory' ? 96 : undefined,
              },
            }
          : f
      )
    );
  };

  const handleLaunchJudgeMode = () => {
    setJudgeMode(true);
    quickDemoLogin('judge');
    setActiveFarmId(MOCK_FARMS[0].id);
    setActiveTab('overview');
  };

  const unreadAlertCount = alerts.filter((a) => !a.read).length;

  const handleNavigate = (route: string) => {
    setActiveTab(route as AppNavigationTab);
  };

  // Render dedicated Full-Screen Auth & Onboarding Routes
  if (activeTab === 'login') {
    return <LoginPage onNavigate={handleNavigate} />;
  }

  if (activeTab === 'signup') {
    return <SignUpPage onNavigate={handleNavigate} />;
  }

  if (activeTab === 'forgot-password') {
    return <ForgotPasswordPage onNavigate={handleNavigate} />;
  }

  if (activeTab === 'onboarding') {
    return (
      <OnboardingPage
        onComplete={(newFarm) => {
          handleAddFarm(newFarm);
          setShowFirstSession(true);
          setActiveTab('overview');
        }}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950">
      {/* Offline Toast Banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-500 text-neutral-950 px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 sticky top-0 z-50">
          <span>You are currently in Offline Field Mode. Cached telemetry and offline models are active.</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        activeFarm={activeFarm}
        farms={farms}
        onSelectFarm={(farm) => setActiveFarmId(farm.id)}
        onOpenAddFarm={() => setActiveTab('onboarding')}
        onOpenOnboarding={() => setActiveTab('onboarding')}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenDemoStory={() => setIsStoryTourOpen(true)}
        onOpenStoryTour={() => setIsStoryTourOpen(true)}
        onOpenDecisionSynthesis={() => setIsDecisionModalOpen(true)}
        unreadAlertsCount={unreadAlertCount}
        onNavigateAlerts={() => setActiveTab('alerts')}
        onNavigate={setActiveTab}
        isOnline={isOnline}
        judgeMode={judgeMode}
      />

      {/* Hackathon Judge Presentation Bar */}
      {judgeMode && (
        <JudgePresentationBar
          currentTab={activeTab}
          onNavigate={setActiveTab}
          onExitJudgeMode={() => setJudgeMode(false)}
          onResetDemoData={handleResetDemoData}
        />
      )}

      {/* App Workspace: Sidebar + Dynamic Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unreadAlertsCount={unreadAlertCount}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <OverviewDashboard
              activeFarm={activeFarm}
              farms={farms}
              weather={weather}
              alerts={alerts}
              onNavigate={setActiveTab}
              onOpenVoice={() => setIsVoiceOpen(true)}
              onOpenDemoStory={() => setIsStoryTourOpen(true)}
              onOpenDecisionSynthesis={() => setIsDecisionModalOpen(true)}
            />
          )}

          {activeTab === 'my-farms' && (
            <MyFarmsPage
              farms={farms}
              activeFarm={activeFarm}
              onSelectFarm={(farm) => {
                setActiveFarmId(farm.id);
                setActiveTab('overview');
              }}
              onOpenAddFarm={() => setActiveTab('onboarding')}
              onDeleteFarm={handleDeleteFarm}
              onUpdateFarm={handleUpdateFarm}
              onNavigate={setActiveTab}
            />
          )}

          {(activeTab === 'farm-intelligence' || activeTab === 'intelligence') && (
            <FarmIntelligencePage
              activeFarm={activeFarm}
              weather={weather}
              onNavigate={setActiveTab}
            />
          )}

          {(activeTab === 'crop-advisor' || activeTab === 'crops') && (
            <CropAdvisorPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
              onUpdateFarm={handleUpdateFarm}
            />
          )}

          {activeTab === 'weather' && (
            <WeatherPage
              activeFarm={activeFarm}
              weather={weather}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'soil' && (
            <SoilPage
              activeFarm={activeFarm}
              onUpdateSoilSource={handleUpdateSoilSource}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'satellite' && (
            <SatellitePage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'farm-health' && (
            <FarmHealthPage
              activeFarm={activeFarm}
              weather={weather}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'photo-analysis' && (
            <PhotoAnalysisPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {(activeTab === 'markets' || activeTab === 'market') && (
            <MarketIntelligencePage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'economics' && (
            <FarmEconomicsPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'simulator' && (
            <ScenarioSimulatorPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {(activeTab === 'risk' || activeTab === 'risks') && (
            <RiskCenterPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'ai-advisor' && (
            <AiAdvisorPage
              activeFarm={activeFarm}
              weather={weather}
              onOpenVoice={() => setIsVoiceOpen(true)}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsCenterPage
              alerts={alerts}
              onMarkRead={handleMarkAlertRead}
              onMarkAllRead={handleMarkAllAlertsRead}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'reports' && (
            <FarmReportsPage
              activeFarm={activeFarm}
              weather={weather}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeCenterPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              activeFarm={activeFarm}
              farms={farms}
              onSelectFarm={(farm) => setActiveFarmId(farm.id)}
              judgeMode={judgeMode}
              onToggleJudgeMode={handleToggleJudgeMode}
              onResetDemoData={handleResetDemoData}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'landing' && (
            <LandingPage
              activeFarm={activeFarm}
              onNavigate={setActiveTab}
              onOpenOnboarding={() => setActiveTab('onboarding')}
              onOpenDemoStory={() => setIsStoryTourOpen(true)}
              onToggleJudgeMode={handleToggleJudgeMode}
              judgeMode={judgeMode}
            />
          )}

          {![
            'overview', 'my-farms', 'farm-intelligence', 'intelligence',
            'crop-advisor', 'crops', 'weather', 'soil', 'satellite',
            'farm-health', 'photo-analysis', 'markets', 'market',
            'economics', 'simulator', 'risk', 'risks', 'ai-advisor',
            'alerts', 'reports', 'knowledge', 'settings', 'landing',
          ].includes(activeTab) && (
            <div className="p-8 sm:p-12 text-center max-w-md mx-auto my-12 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-100">Agricultural Route Not Found</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  The requested navigation path <code className="font-mono text-emerald-400">#{activeTab}</code> is not defined.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Return to Overview Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadAlertsCount={unreadAlertCount}
        onOpenVoice={() => setIsVoiceOpen(true)}
      />

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        farms={farms}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
        onSelectFarm={(farm) => {
          setActiveFarmId(farm.id);
          setActiveTab('overview');
          setIsSearchOpen(false);
        }}
      />

      <VoiceAIModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        activeFarm={activeFarm}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setIsVoiceOpen(false);
        }}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSaveFarm={(newFarm) => {
          handleAddFarm(newFarm);
          setIsOnboardingOpen(false);
        }}
      />

      <DemoStoryWalkthrough
        isOpen={isStoryTourOpen}
        onClose={() => setIsStoryTourOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
        }}
        onLaunchJudgeMode={handleLaunchJudgeMode}
      />

      {/* Signature Decision Synthesis WOW Experience */}
      <DecisionSynthesisModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        farm={activeFarm}
        weather={weather}
        onNavigate={handleNavigate}
      />

      {/* 3-Layer First Session Welcome Tour */}
      <FirstSessionModal
        isOpen={showFirstSession}
        onClose={() => setShowFirstSession(false)}
        farm={activeFarm}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
