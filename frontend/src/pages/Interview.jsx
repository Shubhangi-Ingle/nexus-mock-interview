import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import PreInterviewCheck from "../components/PreInterviewCheck";
import FaceMonitor from "../components/FaceMonitor";
import { startInterview, submitAnswer, completeInterview, abandonInterview } from "../api/interview";
import { fetchQuestionAudio, transcribeAudio } from "../api/voice";

// Testing: skip the system check. Set to false to bring it back.
const SKIP_SYSTEM_CHECK = true;

const AUTO_ADVANCE_SECONDS = 4;

/* ---- inline icon set ---- */
const IconMic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const IconStop = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const IconVolume = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 9v6h4l5 4V5L9 9H5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8a5 5 0 0 1 0 8" />
  </svg>
);
const IconClock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
  </svg>
);
const IconAlertTriangle = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
  </svg>
);
const IconArrowRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ---- voice orb animation (the interviewer) ---- */
const ORB_CSS = `
@keyframes nx-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes nx-speak   { 0%,100% { transform: scale(1); } 30% { transform: scale(1.16); } 60% { transform: scale(1.05); } }
@keyframes nx-ripple  { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(2.3); opacity: 0; } }
@keyframes nx-bar     { 0%,100% { transform: scaleY(.2); } 50% { transform: scaleY(1); } }
@keyframes nx-spin    { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .nx-anim { animation: none !important; transform: none !important; } }
`;

/* ---- audio level helpers: make the orb react to the AI's real voice ---- */
let sharedAudioCtx = null;
async function getSharedContext() {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state !== "running") await sharedAudioCtx.resume();
    return sharedAudioCtx.state === "running" ? sharedAudioCtx : null;
  } catch {
    return null;
  }
}

// One analyser per <audio> element (an element can only be captured once).
// If the browser blocks the audio context we return null and the orb falls
// back to a plain animation; the sound itself is never affected.
const elementGraphs = new WeakMap();
function getElementGraph(el) {
  if (!elementGraphs.has(el)) {
    elementGraphs.set(
      el,
      (async () => {
        const ctx = await getSharedContext();
        if (!ctx) return null;
        const source = ctx.createMediaElementSource(el);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        return { analyser, data: new Uint8Array(analyser.fftSize) };
      })().catch(() => null)
    );
  }
  return elementGraphs.get(el);
}

const readLevel = (analyser, data) => {
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(Math.sqrt(sum / data.length)) * 1.4);
};

const smoothInto = (target, cssVar, level) => {
  const prev = parseFloat(target.style.getPropertyValue(cssVar)) || 0;
  target.style.setProperty(cssVar, (prev * 0.6 + level * 0.4).toFixed(3));
};

// Writes the AI voice level (0 to 1) into --lvl on targetRef while it speaks.
function useSpeechLevel(audioRef, speaking, targetRef) {
  const [reactive, setReactive] = useState(false);
  useEffect(() => {
    const el = audioRef.current;
    const target = targetRef.current;
    if (!speaking || !el || !target) return;
    let stopped = false;
    let raf;
    getElementGraph(el).then((graph) => {
      if (stopped) return;
      if (!graph) {
        setReactive(false);
        return;
      }
      setReactive(true);
      const tick = () => {
        if (stopped) return;
        smoothInto(target, "--lvl", readLevel(graph.analyser, graph.data));
        raf = requestAnimationFrame(tick);
      };
      tick();
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      target.style.setProperty("--lvl", "0");
    };
  }, [speaking]);
  return reactive;
}

// Writes the candidate's mic level (0 to 1) into --mic on targetRef while recording.
function useMicLevel(streamRef, recording, targetRef) {
  useEffect(() => {
    const stream = streamRef.current;
    const target = targetRef.current;
    if (!recording || !stream || !target) return;
    let stopped = false;
    let raf;
    let source;
    (async () => {
      const ctx = await getSharedContext();
      if (!ctx || stopped) return;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (stopped) return;
        smoothInto(target, "--mic", readLevel(analyser, data));
        raf = requestAnimationFrame(tick);
      };
      tick();
    })().catch(() => {});
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      try {
        source?.disconnect();
      } catch {}
      target.style.setProperty("--mic", "0");
    };
  }, [recording]);
}

const BLUE_ORB = "radial-gradient(circle at 35% 30%, #BFDBFE, #3B82F6 45%, #1E3A8A 100%)";
const ORB_STATES = {
  speaking: { label: "Speaking", grad: BLUE_ORB, glow: "0 10px 50px 8px rgba(59,130,246,0.40)" },
  listening: {
    label: "Listening to you",
    grad: "radial-gradient(circle at 35% 30%, #FED7AA, #F97316 50%, #9A3412 100%)",
    glow: "0 10px 44px 8px rgba(249,115,22,0.35)",
  },
  thinking: { label: "Thinking", grad: BLUE_ORB, glow: "0 8px 30px 4px rgba(59,130,246,0.28)" },
  idle: { label: "Ready", grad: BLUE_ORB, glow: "0 8px 30px 4px rgba(59,130,246,0.25)" },
};

const BAR_WEIGHTS = [0.3, 0.45, 0.65, 0.85, 1, 0.85, 0.65, 0.45, 0.3];

const STATE_DOTS = {
  speaking: "bg-blue-500 animate-pulse",
  listening: "bg-orange-500 animate-pulse",
  thinking: "bg-slate-400 animate-pulse",
  idle: "bg-emerald-500",
};

// Fills its tile. Shows the interviewer as a glowing orb that follows the real voice.
function VoiceOrb({ state, audioRef }) {
  const cfg = ORB_STATES[state];
  const speaking = state === "speaking";
  const wrapRef = useRef(null);
  const reactive = useSpeechLevel(audioRef, speaking, wrapRef);
  const live = speaking && reactive; // driven by the real audio level

  return (
    <div ref={wrapRef} className="absolute inset-0 flex flex-col items-center justify-center" style={{ "--lvl": 0 }}>
      {/* faint rings for depth */}
      <span className="absolute w-[44%] aspect-square rounded-full border border-blue-200/70" />
      <span className="absolute w-[68%] aspect-square rounded-full border border-blue-200/40" />

      {/* current state */}
      <span
        className="absolute top-3 left-3 flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white/90 border border-slate-200 px-2.5 py-1 rounded-full shadow-sm"
        aria-live="polite"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOTS[state]}`} />
        {cfg.label}
      </span>

      {/* orb */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {speaking &&
          [0, 1, 2].map((i) => (
            <span
              key={i}
              className="nx-anim absolute w-28 h-28 rounded-full border border-blue-400/50"
              style={{ animation: `nx-ripple 2.4s ease-out ${i * 0.8}s infinite` }}
            />
          ))}
        {state === "thinking" && (
          <span
            className="nx-anim absolute w-36 h-36 rounded-full border-2 border-blue-100 border-t-navy"
            style={{ animation: "nx-spin 1s linear infinite" }}
          />
        )}
        <div
          className="nx-anim w-28 h-28 rounded-full"
          style={{
            background: cfg.grad,
            boxShadow: cfg.glow,
            animation: live ? "none" : speaking ? "nx-speak 1.1s ease-in-out infinite" : "nx-breathe 3.5s ease-in-out infinite",
            transform: live ? "scale(calc(1 + var(--lvl, 0) * 0.5))" : undefined,
            transition: live ? "transform 90ms linear" : undefined,
          }}
        />
      </div>

      {/* voice bars: only visible while the interviewer is speaking */}
      <div
        className={`mt-2 h-9 flex items-center gap-1.5 transition-opacity duration-300 ${speaking ? "opacity-100" : "opacity-0"}`}
        aria-hidden="true"
      >
        {BAR_WEIGHTS.map((w, i) => (
          <span
            key={i}
            className="nx-anim w-1.5 h-9 rounded-full bg-blue-500"
            style={
              live
                ? { transform: `scaleY(calc(0.15 + var(--lvl, 0) * ${w}))`, transition: "transform 90ms linear" }
                : speaking
                  ? { animation: `nx-bar ${0.55 + (i % 4) * 0.12}s ease-in-out ${i * 0.06}s infinite` }
                  : { transform: "scaleY(0.15)" }
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ---- video-call tile ---- */
function Tile({ label, children, alert, dot, topRight, innerRef, className = "" }) {
  return (
    <div
      ref={innerRef}
      style={innerRef ? { "--mic": 0, boxShadow: alert ? undefined : "0 0 0 calc(var(--mic, 0) * 10px) rgba(249,115,22,0.5)" } : undefined}
      className={`relative aspect-video rounded-2xl border-2 transition-colors ${
        alert ? "border-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.25)]" : "border-slate-200 shadow-sm"
      } ${className}`}
    >
      <div className="absolute inset-0 rounded-[14px] overflow-hidden">{children}</div>
      <span className="absolute bottom-3 left-3 flex items-center gap-2 text-[11px] font-semibold text-navy bg-white/95 border border-slate-200 shadow-sm px-2.5 py-1 rounded-full">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        {label}
      </span>
      {topRight}
    </div>
  );
}

/* ---- solid red alert, shown in the top-left corner ---- */
function FaceAlert({ blocked }) {
  return (
    <div role="alert" className="inline-flex items-center gap-2.5 bg-red-600 text-white rounded-lg px-4 py-2.5 shadow-lg">
      <IconAlertTriangle className="w-5 h-5 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-bold">{blocked ? "Camera not available" : "Face not detected"}</p>
        <p className="text-[11px] text-white/90">
          {blocked ? "Allow camera access to continue." : "Please stay in front of the camera."}
        </p>
      </div>
    </div>
  );
}

export default function Interview() {
  const { subjectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { duration, subject, studentName } = location.state || {};
  const name = studentName || "there";

  const [deviceCheckPassed, setDeviceCheckPassed] = useState(SKIP_SYSTEM_CHECK);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const fullscreenViolationsRef = useRef(0);

  // "greeting" -> "interview" — both render on the same call stage, no screen swap
  const [phase, setPhase] = useState("greeting");

  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const answerRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [questionAutoplayBlocked, setQuestionAutoplayBlocked] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState(null);
  const [answerPreview, setAnswerPreview] = useState("");
  const [faceStatus, setFaceStatus] = useState("loading");

  const hasStarted = useRef(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const finishingRef = useRef(false);
  const autoAdvanceIntervalRef = useRef(null);
  const userTileRef = useRef(null);

  const greetingText = `Welcome, ${name}. Today we'll be conducting a ${duration} minute mock interview on ${subject?.name}. Shall we begin your interview?`;

  // Speak the greeting once, as soon as we're on stage.
  useEffect(() => {
    if (!subject || !deviceCheckPassed || phase !== "greeting") return;
    let cancelled = false;
    let url = null;

    const play = async () => {
      setAudioLoading(true);
      try {
        url = await fetchQuestionAudio(greetingText);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setAudioUrl(url);
        setTimeout(() => {
          if (audioRef.current && !cancelled) {
            audioRef.current.play().catch(() => {
              if (!cancelled) setQuestionAutoplayBlocked(true);
            });
          }
        }, 100);
      } catch (err) {
        // student can still click "Yes, let's start" without audio
      } finally {
        setAudioLoading(false);
      }
    };
    play();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCheckPassed, phase]);

  // Start the interview only once the candidate confirms past the greeting
  useEffect(() => {
    if (!subject) return;
    if (!deviceCheckPassed) return;
    if (phase !== "interview") return;
    if (hasStarted.current) return;
    hasStarted.current = true;

    const preStarted = location.state?.preStarted;

    if (preStarted) {
      setSessionId(location.state.sessionId);
      setQuestions(location.state.questions);
      setTimeLeft(location.state.duration * 60);
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const res = await startInterview(subjectId, duration);
        setSessionId(res.data.session_id);
        setQuestions(res.data.questions);
        setTimeLeft(duration * 60);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to start interview.");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, subjectId, duration, deviceCheckPassed, phase]);

  // Countdown timer
  useEffect(() => {
    if (loading || finished || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, finished]);

  // Fetch and auto-play TTS audio whenever the current question changes
  useEffect(() => {
    if (phase !== "interview" || loading || !questions[currentIndex]) return;

    let cancelled = false;
    let previousUrl = null;
    setQuestionAutoplayBlocked(false);

    const playQuestion = async () => {
      setAudioLoading(true);
      try {
        const url = await fetchQuestionAudio(questions[currentIndex].question_text);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        previousUrl = url;
        setAudioUrl(url);
        setTimeout(() => {
          if (audioRef.current && !cancelled) {
            audioRef.current.play().catch(() => {
              if (!cancelled) setQuestionAutoplayBlocked(true);
            });
          }
        }, 100);
      } catch (err) {
        // Non-fatal — student can still read and answer without audio
      } finally {
        setAudioLoading(false);
      }
    };

    playQuestion();

    return () => {
      cancelled = true;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading, phase]);

  // Abandon session if student navigates away mid-interview
  const sessionIdRef = useRef(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current && !finishingRef.current) {
        abandonInterview(sessionIdRef.current).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleAutoFinish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinished(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    try {
      await completeInterview(sessionId);
    } catch (err) {}
    navigate(`/interview/${sessionId}/result`);
  };

  // 1st fullscreen exit -> warning modal. 2nd exit -> auto-submit.
  useEffect(() => {
    if (!deviceCheckPassed) return;

    const handleFullscreenChange = () => {
      if (finishingRef.current) return;
      if (document.fullscreenElement) return;

      fullscreenViolationsRef.current += 1;
      if (fullscreenViolationsRef.current >= 2) {
        setShowFullscreenWarning(false);
        handleAutoFinish();
      } else {
        setShowFullscreenWarning(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceCheckPassed, sessionId]);

  const handleReturnToFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setShowFullscreenWarning(false);
    } catch (err) {}
  };

  const clearAutoAdvance = () => {
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current);
      autoAdvanceIntervalRef.current = null;
    }
    setAutoAdvanceSeconds(null);
  };

  const submitCurrentAnswer = async (finalText) => {
    if (finishingRef.current || finished) return;
    const trimmed = (finalText || "").trim();
    if (!trimmed) {
      setError("Please record an answer before continuing.");
      return;
    }

    clearAutoAdvance();
    setError("");
    setSubmitting(true);

    try {
      await submitAnswer(sessionId, questions[currentIndex].question_text, trimmed);

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((i) => i + 1);
        answerRef.current = "";
        setAnswerPreview("");
        setSubmitting(false);
      } else {
        if (finishingRef.current) return;
        finishingRef.current = true;
        clearInterval(timerRef.current);
        setFinished(true);
        await completeInterview(sessionId);
        navigate(`/interview/${sessionId}/result`);
      }
    } catch (err) {
      if (err.response?.status === 400) {
        navigate(`/interview/${sessionId}/result`);
        return;
      }
      setError(err.response?.data?.detail || "Failed to submit answer.");
      setSubmitting(false);
    }
  };

  const startAutoAdvance = () => {
    setAutoAdvanceSeconds(AUTO_ADVANCE_SECONDS);
    autoAdvanceIntervalRef.current = setInterval(() => {
      setAutoAdvanceSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(autoAdvanceIntervalRef.current);
          autoAdvanceIntervalRef.current = null;
          submitCurrentAnswer(answerRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = async () => {
    setError("");
    clearAutoAdvance();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          if (text) {
            answerRef.current = answerRef.current.trim() ? `${answerRef.current.trim()} ${text}` : text;
            setAnswerPreview(answerRef.current);
            setIsTranscribing(false);
            startAutoAdvance();
          } else {
            setIsTranscribing(false);
          }
        } catch (err) {
          setError("Couldn't transcribe your answer. Please try again.");
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access is required to record your answer.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleMicToggle = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Hooks must stay above every early return below
  useMicLevel(streamRef, isRecording, userTileRef);

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-gray-500 mb-4">No interview session found.</p>
          <button onClick={() => navigate("/dashboard")} className="text-navy font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!deviceCheckPassed) {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
        <PreInterviewCheck subject={subject} duration={duration} onReady={() => setDeviceCheckPassed(true)} />
      </div>
    );
  }

  if (error && phase === "interview" && questions.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-navy font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const inCall = phase === "interview" && !loading && questions.length > 0;
  const currentQuestion = inCall ? questions[currentIndex] : null;
  const isLastQuestion = inCall && currentIndex + 1 === questions.length;

  const captionText =
    phase === "greeting"
      ? `Welcome, ${name}. We'll be conducting a ${duration}-minute interview on ${subject.name}. Shall we begin?`
      : loading
        ? "Connecting to your interviewer..."
        : inCall
          ? currentQuestion.question_text
          : "";

  const faceMissing = !finished && faceStatus === "missing";
  const cameraBlocked = !finished && faceStatus === "camera-blocked";
  const showFaceAlert = faceMissing || cameraBlocked;

  const orbState = isRecording
    ? "listening"
    : isSpeaking
      ? "speaking"
      : audioLoading || isTranscribing || submitting || loading
        ? "thinking"
        : "idle";

  const faceDot =
    faceStatus === "ok" ? "bg-emerald-500" : showFaceAlert ? "bg-red-500 animate-pulse" : "bg-slate-300";

  const cardLabel = inCall ? `Question ${currentIndex + 1} of ${questions.length}` : phase === "greeting" ? "Welcome" : "Getting ready";

  return (
    <div className="h-screen flex flex-col bg-[#F4F6FA] overflow-hidden">
      <style>{ORB_CSS}</style>

      {showFullscreenWarning && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-7 text-center animate-fade-in-up"
            style={{ boxShadow: "0 32px 64px -16px rgba(0,0,0,0.5)" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <IconAlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-navy mb-1.5">You left full screen</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              This is your only warning. Leaving full screen again will automatically submit your interview.
            </p>
            <button
              onClick={handleReturnToFullscreen}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-navy hover:bg-navy-dark transition"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      {/* Top bar: face alert (or title) on the left, timer on the right */}
      <header className="shrink-0 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-4 px-4 sm:px-8 h-16">
          <div className="min-w-0">
            {showFaceAlert ? (
              <FaceAlert blocked={cameraBlocked} />
            ) : (
              <div>
                <p className="text-[11px] font-semibold text-brand-orange">Mock interview</p>
                <h1 className="text-base font-bold text-navy leading-tight truncate">{subject.name}</h1>
              </div>
            )}
          </div>
          {phase === "interview" && (
            <span
              className={`shrink-0 flex items-center gap-2 text-base font-semibold tabular-nums px-4 py-2 rounded-full border ${
                timeLeft <= 30 ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-50 text-navy border-slate-200"
              }`}
            >
              <IconClock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </header>

      {/* Stage */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8">
        <div className="min-h-full flex flex-col items-center justify-center gap-5 py-6">
          <div className="w-full max-w-[1240px] grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Interviewer */}
            <Tile label="Nexus AI Interviewer" className="bg-[radial-gradient(circle_at_50%_45%,#DCE9FF_0%,#EEF4FF_55%,#F8FAFF_100%)]">
              <VoiceOrb state={orbState} audioRef={audioRef} />
            </Tile>

            {/* Candidate */}
            <Tile
              innerRef={userTileRef}
              label="You"
              alert={showFaceAlert}
              dot={faceDot}
              className="bg-slate-100"
              topRight={
                isRecording && (
                  <span className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] font-semibold text-white bg-red-600 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Recording
                  </span>
                )
              }
            >
              <FaceMonitor active={!finished} onStatusChange={setFaceStatus} />
              {faceMissing && (
                <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
                  <span className="text-xs font-semibold bg-red-600 text-white px-3 py-1 rounded-full shadow">
                    Move back into the frame
                  </span>
                </div>
              )}
            </Tile>
          </div>

          {/* Question + answer controls, kept together */}
          <section className="w-full max-w-[1240px] bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-[0_8px_24px_-14px_rgba(15,27,76,0.25)]">
            <div className="flex items-center justify-between gap-4 mb-3">
              <p className="text-sm font-semibold text-brand-orange">{cardLabel}</p>
              {inCall && (
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {questions.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i < currentIndex ? "w-6 bg-brand-orange" : i === currentIndex ? "w-8 bg-navy" : "w-6 bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="text-xl sm:text-2xl font-semibold text-navy font-display leading-snug">{captionText}</p>

            {questionAutoplayBlocked && !isSpeaking && (inCall || phase === "greeting") && (
              <button
                onClick={() => {
                  audioRef.current
                    ?.play()
                    .then(() => setQuestionAutoplayBlocked(false))
                    .catch(() => {});
                }}
                className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-brand-orange"
              >
                <IconVolume className="w-4 h-4" /> Tap to hear it
              </button>
            )}

            {autoAdvanceSeconds !== null && answerPreview && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-400 mb-1">Your answer</p>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{answerPreview}</p>
              </div>
            )}

            {(phase === "greeting" || inCall) && (
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
                {phase === "greeting" ? (
                  <>
                    <button
                      onClick={() => setPhase("interview")}
                      className="inline-flex items-center justify-center gap-2 bg-navy hover:bg-navy-dark text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition"
                    >
                      Yes, let's start
                      <IconArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-slate-500">Your interviewer will ask each question aloud. Answer out loud when you are ready.</p>
                  </>
                ) : autoAdvanceSeconds !== null ? (
                  <div className="flex flex-wrap items-center gap-3 w-full">
                    <p className="text-sm text-slate-600 mr-auto">
                      Moving on in <span className="font-semibold text-navy tabular-nums">{autoAdvanceSeconds}s</span>
                    </p>
                    <button
                      onClick={startRecording}
                      className="text-sm font-semibold text-navy bg-white border border-slate-300 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition"
                    >
                      Add more
                    </button>
                    <button
                      onClick={() => submitCurrentAnswer(answerRef.current)}
                      className="text-sm font-semibold text-white bg-navy px-5 py-2.5 rounded-xl hover:bg-navy-dark transition"
                    >
                      {isLastQuestion ? "Finish now" : "Next question"}
                    </button>
                  </div>
                ) : submitting || isTranscribing ? (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-navy animate-spin" />
                    {submitting
                      ? isLastQuestion
                        ? "Finishing up and generating your report..."
                        : "Submitting your answer..."
                      : "Processing your answer..."}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleMicToggle}
                      aria-label={isRecording ? "Stop recording" : "Start recording your answer"}
                      className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-md transition ${
                        isRecording ? "bg-red-500 animate-pulse" : "bg-navy hover:bg-navy-dark hover:-translate-y-0.5"
                      }`}
                    >
                      {isRecording ? <IconStop className="w-5 h-5 text-white" /> : <IconMic className="w-6 h-6 text-white" />}
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-navy">{isRecording ? "Recording your answer" : "Ready when you are"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isRecording ? "Tap the stop button when you finish." : "Tap the microphone and answer out loud."}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </section>
        </div>
      </main>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          className="hidden"
          onPlay={() => setIsSpeaking(true)}
          onEnded={() => setIsSpeaking(false)}
          onPause={() => setIsSpeaking(false)}
        />
      )}
    </div>
  );
}