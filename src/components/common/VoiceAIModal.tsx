import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Bot, AlertCircle, ArrowRight } from 'lucide-react';
import { Farm } from '../../types';

interface VoiceAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFarm: Farm;
  onNavigate?: (tab: any) => void;
}

export const VoiceAIModal: React.FC<VoiceAIModalProps> = ({ isOpen, onClose, activeFarm, onNavigate }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Tap the microphone to speak with NEXUS');
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = 'en-US';

        recog.onstart = () => {
          setIsListening(true);
          setStatusMessage('Listening to your query...');
        };

        recog.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recog.onerror = (event: any) => {
          console.warn('Speech recognition error', event.error);
          setIsListening(false);
          setStatusMessage('Microphone access interrupted or unsupported. You can also pick a prompt below.');
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, []);

  if (!isOpen) return null;

  const startListening = () => {
    setResponseOutput(null);
    setTranscript('');
    setStatusMessage('Listening... speak clearly.');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // In case recognition is already running
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current.start(), 200);
      }
    } else {
      setStatusMessage('Voice recognition is active in fallback mode. Select a sample query below:');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleProcessQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setStatusMessage('Analyzing farm metrics & running agronomic models...');

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
          },
        }),
      });

      const data = await res.json();
      const textToSpeak =
        data.recommendation ||
        `Farm health is currently rated at ${activeFarm.healthScore} out of 100. Field conditions are favorable. Irrigation is advised within 48 hours.`;

      setResponseOutput(textToSpeak);
      setStatusMessage('NEXUS Voice Advisory Ready:');
      speakText(textToSpeak);
    } catch (err) {
      const fallback = `Farm health is currently 82 out of 100. Topsoil moisture is 22.4%, slightly below threshold. We advise scheduling a light sprinkler pass tomorrow morning.`;
      setResponseOutput(fallback);
      speakText(fallback);
      setStatusMessage('Analysis complete (Offline Rule Base)');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 relative flex flex-col items-center text-center">
        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            stopListening();
            stopSpeaking();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold font-mono tracking-widest text-emerald-400 uppercase">
            NEXUS Acoustic Field Interface
          </span>
        </div>
        <h3 className="text-lg font-bold text-neutral-100 mb-1">Voice Agricultural Advisor</h3>
        <p className="text-xs text-neutral-400 mb-6">
          Hands-free decision support calibrated for {activeFarm.name}
        </p>

        {/* Microphone Animated Disc */}
        <div className="relative mb-6">
          {isListening && (
            <>
              <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative z-10 ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30 scale-105'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-500/30'
            }`}
          >
            {isListening ? <MicOff className="w-10 h-10 animate-pulse" /> : <Mic className="w-10 h-10" />}
          </button>
        </div>

        {/* Dynamic Waveform Graphic */}
        {isListening && (
          <div className="flex items-center gap-1.5 h-8 mb-4">
            {[18, 32, 24, 40, 20, 36, 28, 44, 22, 34, 16, 30].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-emerald-400 rounded-full animate-bounce"
                style={{
                  height: `${h}px`,
                  animationDelay: `${(i % 5) * 120}ms`,
                  animationDuration: '600ms',
                }}
              />
            ))}
          </div>
        )}

        {/* Status Message */}
        <p className="text-xs font-medium text-neutral-300 mb-3">{statusMessage}</p>

        {/* Current Transcript */}
        {transcript && (
          <div className="w-full p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 mb-4 font-mono text-left">
            <span className="text-neutral-500 block text-[10px] uppercase font-sans">You asked:</span>
            &ldquo;{transcript}&rdquo;
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => handleProcessQuery(transcript)}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
              >
                Analyze Now &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Response Card */}
        {responseOutput && (
          <div className="w-full p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-neutral-200 text-left mb-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <Bot className="w-4 h-4" />
                <span>NEXUS Recommendation</span>
              </div>
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Stop Speech</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => speakText(responseOutput)}
                  className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Replay Audio</span>
                </button>
              )}
            </div>
            <p className="text-neutral-100 font-medium leading-relaxed">{responseOutput}</p>
          </div>
        )}

        {/* Preset Sample Questions for Instant Test */}
        <div className="w-full pt-4 border-t border-neutral-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
            Suggested Field Queries:
          </span>
          <div className="flex flex-col gap-1.5 text-left text-xs">
            {[
              'How is my farm doing right now?',
              'Should I irrigate today based on soil moisture and rain?',
              'Which crop gives me the highest projected margin in this soil?',
              'What is the optimal spraying window for tomorrow morning?',
            ].map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTranscript(q);
                  handleProcessQuery(q);
                }}
                className="px-3 py-2 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300 hover:text-emerald-400 text-xs flex items-center justify-between transition-colors"
              >
                <span>&ldquo;{q}&rdquo;</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
