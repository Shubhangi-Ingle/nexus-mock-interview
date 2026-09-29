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
const IconHeadset = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a8 8 0 0 1 16 0" />
    <rect x="3" y="13" width="4" height="6" rx="1.5" />
    <rect x="17" y="13" width="4" height="6" rx="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 19v1a3 3 0 0 1-3 3h-3" />
  </svg>
);
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

function Tile({ children, label, badge }) {
  return (
    <div className="relative flex-1 rounded-2xl bg-gradient-to-br from-navy to-navy-dark border border-white/10 overflow-hidden flex items-center justify-center min-h-0">
      {children}
      <span className="absolute bottom-3 left-3 text-[11px] font-semibold text-white bg-black/40 backdrop-blur px-2.5 py-1 rounded-full">
        {label}
      </span>
      {badge}
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

  const hasStarted = useRef(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const finishingRef = useRef(false);
  const autoAdvanceIntervalRef = useRef(null);

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

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden">
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

      {/* Top call bar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3.5">
        <div>
          <p className="text-[10px] font-semibold text-brand-orange uppercase tracking-wider">Mock Interview</p>
          <h1 className="text-sm font-bold text-white leading-tight -mt-0.5">{subject.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {inCall && (
            <span className="text-xs font-medium text-white/40">
              Question {currentIndex + 1} of {questions.length}
            </span>
          )}
          {phase === "interview" && (
            <span
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                timeLeft <= 30 ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-white/10 text-white/80 border-white/10"
              }`}
            >
              <IconClock className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {inCall && (
        <div className="shrink-0 flex items-center justify-center gap-1.5 pb-3">
          {questions.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i < currentIndex ? "w-6 bg-brand-orange" : i === currentIndex ? "w-8 bg-white" : "w-6 bg-white/15"
              }`}
            />
          ))}
        </div>
      )}

      {/* Two-tile call stage */}
      <div className="flex-1 min-h-0 px-4 sm:px-6 pb-2">
        <div className="max-w-5xl mx-auto h-full flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Interviewer tile */}
          <Tile
            label="Nexus AI Interviewer"
            badge={
              isRecording && (
                <span className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-semibold text-red-300 bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  REC
                </span>
              )
            }
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              {isSpeaking ? (
                <div className="flex items-end gap-1 h-6">
                  <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 bg-white rounded-full animate-speak-bar" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <IconHeadset className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              )}
            </div>

            {/* Caption bar */}
            {captionText && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-9 px-4">
                <p className="text-white text-xs sm:text-sm font-medium text-center leading-relaxed max-w-md mx-auto">
                  {audioLoading ? "Preparing..." : captionText}
                </p>
                {questionAutoplayBlocked && !isSpeaking && inCall && (
                  <button
                    onClick={() => {
                      audioRef.current
                        ?.play()
                        .then(() => setQuestionAutoplayBlocked(false))
                        .catch(() => {});
                    }}
                    className="mx-auto mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand-orange"
                  >
                    <IconVolume className="w-3.5 h-3.5" /> Tap to hear
                  </button>
                )}
              </div>
            )}
          </Tile>

          {/* Candidate tile */}
          <Tile label="You">
            <FaceMonitor active={!finished} />
          </Tile>
        </div>
      </div>

      {error && (
        <p className="shrink-0 text-center text-red-400 text-xs pb-1">{error}</p>
      )}

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

      {/* Bottom control bar */}
      <div className="shrink-0 flex items-center justify-center pb-6 pt-3">
        {phase === "greeting" ? (
          <button
            onClick={() => setPhase("interview")}
            className="flex items-center gap-2 bg-white text-navy font-semibold text-sm px-6 py-3.5 rounded-full hover:-translate-y-0.5 transition shadow-lg"
          >
            Yes, let's start
            <IconArrowRight className="w-4 h-4" />
          </button>
        ) : !inCall ? null : autoAdvanceSeconds !== null ? (
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 backdrop-blur rounded-full pl-4 pr-2 py-2">
            <span className="text-xs text-white/70">Next in {autoAdvanceSeconds}s</span>
            <button
              onClick={startRecording}
              className="text-xs font-semibold text-white bg-white/10 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/20 transition"
            >
              Add more
            </button>
            <button
              onClick={() => submitCurrentAnswer(answerRef.current)}
              className="text-xs font-semibold text-navy bg-white px-3 py-1.5 rounded-full hover:bg-gray-100 transition"
            >
              {isLastQuestion ? "Finish now" : "Next now"}
            </button>
          </div>
        ) : submitting ? (
          <p className="text-white/50 text-xs">
            {isLastQuestion ? "Finishing up & generating your report..." : "Submitting..."}
          </p>
        ) : isTranscribing ? (
          <p className="text-white/50 text-xs">Processing your answer...</p>
        ) : (
          <button
            onClick={handleMicToggle}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition ${
              isRecording ? "bg-red-500 animate-pulse" : "bg-white hover:-translate-y-0.5"
            }`}
          >
            {isRecording ? <IconStop className="w-6 h-6 text-white" /> : <IconMic className="w-6 h-6 text-navy" />}
          </button>
        )}
      </div>
    </div>
  );
}