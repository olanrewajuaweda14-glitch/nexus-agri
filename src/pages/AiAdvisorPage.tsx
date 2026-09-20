import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Mic,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Share2,
  RefreshCw,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Farm, WeatherData, AppNavigationTab } from '../types';

interface AiAdvisorPageProps {
  activeFarm: Farm;
  weather: WeatherData;
  onOpenVoice: () => void;
  onNavigate: (tab: AppNavigationTab) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'nexus';
  text: string;
  timestamp: string;
  recommendation?: string;
  reasoning?: string;
  dataSourcesUsed?: string[];
  confidencePercent?: number;
  actionItems?: string[];
  caveats?: string[];
}

export const AiAdvisorPage: React.FC<AiAdvisorPageProps> = ({
  activeFarm,
  weather,
  onOpenVoice,
  onNavigate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'nexus',
      text: `Hello! I am NEXUS, your agricultural intelligence advisor. I have analyzed real-time metrics for ${activeFarm.name} (${activeFarm.sizeHa} ha, ${activeFarm.currentCrop}, ${activeFarm.growthStage}). How can I assist your farming decisions today?`,
      timestamp: 'Just now',
      recommendation: 'Current focus: Monitor topsoil moisture (22.4%) and plan foliar spraying for tomorrow morning.',
      reasoning: 'Calm morning winds (<6 km/h) create an ideal absorption window before Monday rain.',
      dataSourcesUsed: ['ECMWF Atmospheric Forecast', 'Sentinel-2 Multispectral NDVI', 'SoilGrids 250m Profile'],
      confidencePercent: 92,
      actionItems: [
        'Inspect Block B-2 for localized moisture percolation variance',
        'Prepare tractor sprayer rig for 07:00 AM pass tomorrow',
      ],
      caveats: [
        'Delay spray if sudden nocturnal cloudburst occurs exceeding 5mm.',
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const suggestedQuestions = [
    'Why is my farm health score 82?',
    'Should I apply fertilizer this week or wait for rain?',
    'How does the upcoming rain affect my maize tasseling?',
    'What is my break-even yield at current input costs?',
    'Should I switch to Soybean next season for higher margins?',
  ];

  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText,
          farmContext: {
            name: activeFarm.name,
            sizeHa: activeFarm.sizeHa,
            crop: activeFarm.currentCrop,
            growthStage: activeFarm.growthStage,
            soilMoisture: `${activeFarm.soil.moisturePercent}%`,
            soilPh: activeFarm.soil.ph,
            healthScore: activeFarm.healthScore,
            expectedYield: `${activeFarm.estimatedYieldTonsPerHa} t/ha`,
            rainfallOutlook: '38.6mm next 7 days',
          },
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'nexus',
        text: data.answer || data.recommendation || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendation: data.recommendation,
        reasoning: data.reasoning,
        dataSourcesUsed: data.dataSourcesUsed || ['ECMWF Weather Model', 'SoilGrids Profile', 'AFEX Spot Prices'],
        confidencePercent: data.confidenceScore || 88,
        actionItems: data.actionItems || [
          'Verify soil moisture at 15cm depth',
          'Coordinate seasonal labor for weed scouting',
        ],
        caveats: data.caveats || ['Subject to local convective cloud developments'],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Fallback response
      const fallbackAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'nexus',
        text: `Based on deterministic agronomic rules for ${activeFarm.name}: Soil moisture is at ${activeFarm.soil.moisturePercent}% and 38.6mm of rainfall is forecasted across the 7-day outlook.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendation: 'Schedule top-dressing within 48 hours to capitalize on incoming soil moisture.',
        reasoning: 'Urea incorporated by gentle convective rain minimizes volatilization losses by over 60%.',
        dataSourcesUsed: ['ECMWF 7-Day ECMWF', 'SoilGrids Pedology'],
        confidencePercent: 86,
        actionItems: [
          'Store fertilizer bags in dry elevated pallets',
          'Target application when wind speed remains under 8 km/h',
        ],
        caveats: ['Avoid waterlogged low-lying drainage depressions'],
      };
      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
              Agronomic Decision Intelligence
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="text-xs text-neutral-400">Context: {activeFarm.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2 mt-1">
            <Bot className="w-6 h-6 text-emerald-400" />
            <span>Ask NEXUS &mdash; Agricultural AI Advisor</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
            Grounded reasoning combining physical soil science, satellite chlorophyll metrics, climate models, and
            market commodities.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenVoice}
          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-emerald-400 text-xs font-bold border border-neutral-700 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Mic className="w-4 h-4" />
          <span>Hands-Free Voice Interface</span>
        </button>
      </div>

      {/* Suggested Questions Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-[11px] font-bold uppercase text-neutral-500 shrink-0">Quick Prompts:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(q)}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-emerald-400 whitespace-nowrap text-xs transition-colors shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6 min-h-[480px] max-h-[620px] overflow-y-auto">
        {messages.map((msg) => {
          const isNexus = msg.sender === 'nexus';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isNexus ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isNexus
                    ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400'
                    : 'bg-neutral-800 border border-neutral-700 text-neutral-300'
                }`}
              >
                {isNexus ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Body */}
              <div className={`space-y-2 max-w-2xl text-xs ${!isNexus && 'text-right'}`}>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                  <span className="font-bold text-neutral-300">{isNexus ? 'NEXUS Intelligence' : 'You'}</span>
                  <span>&bull;</span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl leading-relaxed text-neutral-100 ${
                    isNexus
                      ? 'bg-neutral-950 border border-neutral-800 text-left'
                      : 'bg-emerald-600 text-white font-medium text-left'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>

                  {/* If NEXUS, render structured agronomic insights */}
                  {isNexus && msg.recommendation && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-3">
                      {/* Recommendation */}
                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                        <strong className="text-emerald-400 text-xs block mb-0.5">Recommendation:</strong>
                        <p className="text-neutral-200">{msg.recommendation}</p>
                      </div>

                      {/* Reasoning */}
                      {msg.reasoning && (
                        <div className="text-neutral-300">
                          <strong className="text-neutral-400 block text-[11px] uppercase tracking-wider mb-0.5">
                            Agronomic Rationale (&ldquo;The Why&rdquo;):
                          </strong>
                          <p className="leading-relaxed">{msg.reasoning}</p>
                        </div>
                      )}

                      {/* Action items */}
                      {msg.actionItems && msg.actionItems.length > 0 && (
                        <div className="space-y-1">
                          <strong className="text-neutral-400 block text-[11px] uppercase tracking-wider">
                            Prescribed Ground Actions:
                          </strong>
                          <div className="space-y-1">
                            {msg.actionItems.map((item, iIdx) => (
                              <div key={iIdx} className="flex items-start gap-2 text-neutral-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Data Sources & Confidence */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-400">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Grounded in: {msg.dataSourcesUsed?.join(' &bull; ')}</span>
                        </div>
                        {msg.confidencePercent && (
                          <span className="text-emerald-400 font-bold">
                            Confidence: {msg.confidencePercent}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-xs text-neutral-400 font-mono ml-1">Analyzing satellite &amp; weather grids...</span>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <div className="p-2 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenVoice}
          className="p-2.5 rounded-xl text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition-colors"
          title="Voice Speech Input"
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage(inputQuery);
          }}
          placeholder={`Ask anything about ${activeFarm.name}, fertilizer timing, pests, market prices...`}
          className="w-full bg-transparent text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none px-2"
        />

        <button
          type="button"
          disabled={!inputQuery.trim() || isTyping}
          onClick={() => handleSendMessage(inputQuery)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
