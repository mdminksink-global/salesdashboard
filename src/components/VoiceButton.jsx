import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Mic button that dictates into a text field via the browser Speech API.
 * Renders nothing if the browser doesn't support it (Safari/Firefox).
 * onAppend(text) receives the recognized phrase to append to your field.
 */
export default function VoiceButton({ onAppend, lang = 'en-IN', title = 'Dictate' }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

  if (!SR) return null;

  const toggle = () => {
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      if (text) onAppend(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Stop dictation' : title}
      aria-label={listening ? 'Stop dictation' : title}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 transition-colors cursor-pointer ${
        listening
          ? 'bg-rose-600 text-white ring-rose-600 animate-pulse'
          : 'bg-white text-slate-500 ring-slate-300 hover:text-brand-600 hover:ring-brand-300'
      }`}
    >
      {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
