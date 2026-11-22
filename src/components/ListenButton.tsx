import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

/**
 * Reads text aloud with the phone's built-in voice (no data used).
 * Prefers a Nigerian English voice when the device has one.
 */
export function ListenButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);
  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const voice = voices.find((v) => v.lang === 'en-NG') ?? voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en'));
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-NG';
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <button type="button" className="btn btn-ghost press w-full sm:w-auto" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square className="h-4 w-4 fill-current" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      {speaking ? 'Stop' : label}
    </button>
  );
}
