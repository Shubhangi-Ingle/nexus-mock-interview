import { useEffect, useRef, useState } from "react";
import { fetchQuestionAudio } from "../api/voice";

const IconVolume = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 9v6h4l5 4V5L9 9H5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8a5 5 0 0 1 0 8" />
  </svg>
);

export default function Greeting({ name, subject, duration, onStart }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  const greetingText = `Welcome, ${name}. Today we'll be conducting a ${duration} minute mock interview on ${subject.name}. Shall we begin your interview?`;

  const playGreeting = async () => {
    setAudioBlocked(false);
    try {
      let url = audioUrlRef.current;
      if (!url) {
        url = await fetchQuestionAudio(greetingText);
        audioUrlRef.current = url;
      }
      if (audioRef.current) {
        audioRef.current.src = url;
        setIsSpeaking(true);
        await audioRef.current.play();
      }
    } catch (err) {
      setAudioBlocked(true);
    }
  };

  useEffect(() => {
    playGreeting();
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-8 bg-paper">
      <div
        className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 text-center animate-fade-in-up"
        style={{ boxShadow: "0 32px 64px -16px rgba(15,27,76,0.20), 0 6px 16px -4px rgba(15,27,76,0.08)" }}
      >
        <div className="w-16 h-16 rounded-full bg-navy flex items-center justify-center mx-auto mb-5 relative">
          {isSpeaking ? (
            <div className="flex items-end gap-1 h-5">
              <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "0ms" }} />
              <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "150ms" }} />
              <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <span className="text-white text-lg font-bold">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-orange mb-2">Your Interviewer</p>
        <h1 className="text-xl font-bold text-navy mb-3">Welcome, {name}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">
          We'll be conducting a {duration}-minute mock interview on <span className="font-semibold text-navy">{subject.name}</span>.
          Shall we begin?
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-gray-400">{isSpeaking ? "Speaking..." : "Ready when you are"}</span>
          {audioBlocked && (
            <button
              onClick={playGreeting}
              className="flex items-center gap-1 text-xs font-semibold text-navy hover:text-navy-dark transition"
            >
              <IconVolume className="w-3.5 h-3.5" />
              Play greeting
            </button>
          )}
        </div>

        <button
          onClick={onStart}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-navy hover:bg-navy-dark hover:-translate-y-0.5 active:translate-y-0 transition"
          style={{ boxShadow: "0 8px 20px -6px rgba(15,27,76,0.45)" }}
        >
          Yes, let's start
        </button>

        <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} className="hidden" />
      </div>
    </div>
  );
}