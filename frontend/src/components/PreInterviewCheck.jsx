import { useState, useRef, useEffect } from "react";
import { fetchQuestionAudio, transcribeAudio } from "../api/voice";
import api from "../api/axios";

const SAMPLE_PHRASE = "I am ready to start my interview.";
const SPEAKER_PHRASE = "This is a test of your speakers. If you can hear this clearly, you're all set.";

/* ---- inline icon set, consistent with Dashboard/Navbar ---- */
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconAlert = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconMic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const IconVolume = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 9v6h4l5 4V5L9 9H5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8a5 5 0 0 1 0 8" />
  </svg>
);
const IconCamera = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const IconWifi = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13a11 11 0 0 1 14 0M8 16.5a6.5 6.5 0 0 1 8 0M12 20h.01" />
  </svg>
);
const IconMonitor = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4" />
  </svg>
);
const IconArrowRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function StatusIcon({ status }) {
  if (status === "done") {
    return (
      <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
        <IconCheck className="w-3 h-3 text-white" />
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <IconAlert className="w-3 h-3 text-amber-500" />
      </span>
    );
  }
  if (status === "checking") {
    return <span className="w-5 h-5 rounded-full border-2 border-navy border-t-transparent animate-spin shrink-0" />;
  }
  return <span className="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0" />;
}

function CheckRow({ status, label, icon: Icon, children }) {
  return (
    <div className="py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <StatusIcon status={status} />
        <Icon className="w-4 h-4 text-gray-400 shrink-0" />
        <p className={`text-sm font-medium ${status === "done" ? "text-gray-700" : "text-navy"}`}>{label}</p>
      </div>
      {children && <div className="mt-2.5 ml-[38px]">{children}</div>}
    </div>
  );
}

export default function PreInterviewCheck({ subject, duration, onReady }) {
  const [browserStatus, setBrowserStatus] = useState("checking");
  const [networkStatus, setNetworkStatus] = useState("checking");

  const [speakerStatus, setSpeakerStatus] = useState("pending");
  const speakerAudioUrlRef = useRef(null);
  const speakerAudioRef = useRef(null);

  const [micStatus, setMicStatus] = useState("pending");
  const [micTranscript, setMicTranscript] = useState("");
  const [micError, setMicError] = useState("");
  const micRecorderRef = useRef(null);
  const micChunksRef = useRef([]);
  const micStreamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState("pending"); // pending | checking | done
  const webcamStreamRef = useRef(null);
  const webcamVideoRef = useRef(null);

  const [starting, setStarting] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    const supportsRecording =
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof window.MediaRecorder !== "undefined";
    setBrowserStatus(supportsRecording ? "done" : "warning");

    const checkNetwork = async () => {
      try {
        await api.get("/health", { timeout: 5000 });
        setNetworkStatus("done");
      } catch (err) {
        setNetworkStatus("warning");
      }
    };
    checkNetwork();

    return () => {
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      webcamStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (speakerAudioUrlRef.current) URL.revokeObjectURL(speakerAudioUrlRef.current);
    };
  }, []);

  const playSpeakerTest = async () => {
    setSpeakerStatus("checking");
    try {
      let url = speakerAudioUrlRef.current;
      if (!url) {
        url = await fetchQuestionAudio(SPEAKER_PHRASE);
        speakerAudioUrlRef.current = url;
      }
      if (speakerAudioRef.current) {
        speakerAudioRef.current.src = url;
        await speakerAudioRef.current.play();
        setSpeakerStatus("done");
      }
    } catch (err) {
      setSpeakerStatus("pending");
    }
  };

  const startMicTest = async () => {
    setMicError("");
    setMicTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      micRecorderRef.current = recorder;
      micChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) micChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        micStreamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(micChunksRef.current, { type: "audio/webm" });

        setMicStatus("checking");
        try {
          const text = await transcribeAudio(blob);
          if (text && text.trim()) {
            setMicTranscript(text);
            setMicStatus("done");
          } else {
            setMicError("We didn't catch any speech — please try again.");
            setMicStatus("pending");
          }
        } catch (err) {
          setMicError("Couldn't process your recording — please try again.");
          setMicStatus("pending");
        }
      };

      recorder.start();
      setMicStatus("recording");
    } catch (err) {
      setMicError("Microphone access is required to continue.");
      setMicStatus("pending");
    }
  };

  const stopMicTest = () => {
    if (micRecorderRef.current && micRecorderRef.current.state !== "inactive") {
      micRecorderRef.current.stop();
    }
  };

  const enableWebcam = async () => {
    setCameraStatus("checking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      webcamStreamRef.current = stream;
      setCameraStatus("done");
      setTimeout(() => {
        if (webcamVideoRef.current) webcamVideoRef.current.srcObject = stream;
      }, 50);
    } catch (err) {
      setCameraStatus("pending");
    }
  };

  const checks = [browserStatus, networkStatus, speakerStatus, micStatus, cameraStatus];
  const doneCount = checks.filter((s) => s === "done" || s === "warning").length;
  const totalChecks = checks.length;
  const allDone = checks.every((s) => s === "done" || s === "warning");

  const handleStart = async () => {
    setStarting(true);
    setFullscreenError("");
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      onReady(webcamStreamRef.current);
    } catch (err) {
      setStarting(false);
      setFullscreenError("Couldn't enter full screen. Please allow it and try again.");
    }
  };

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center px-6 py-8 overflow-hidden bg-paper">
      <div className="w-full max-w-6xl h-full max-h-[800px] flex flex-col animate-fade-in-up">
        
        <div className="text-center mb-5 shrink-0">
           <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-orange mb-1.5 font-display">
            System Check
          </p>
          <h1 className="text-2xl font-bold text-navy tracking-tight font-display">
            {subject.name} Mock Interview — {duration} minutes
          </h1>


        </div>



        <div
          className="bg-white border border-gray-100 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0"
          style={{ boxShadow: "0 32px 64px -16px rgba(15,27,76,0.20), 0 6px 16px -4px rgba(15,27,76,0.08)" }}
        >
          {/* Left: instructions */}
          <div className="p-8 lg:border-r border-gray-100 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-5 shrink-0">
              <span className="w-1 h-5 bg-brand-orange rounded-full" />
              <h2 className="font-bold text-navy text-base">Interview Instructions</h2>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {[
                {
                  title: "Wait for the greeting",
                  text: "The AI interviewer starts each question — wait for it before you answer.",
                },
                {
                  title: "Camera stays on",
                  text: "Full screen and camera access are required for the whole session.",
                },
                {
                  title: "Questions move forward automatically",
                  text: "Once you submit an answer, the next question follows — there's no going back.",
                },
                {
                  title: `Fixed ${duration}-minute session`,
                  text: "The timer runs continuously in full screen until the interview ends.",
                },
                {
                  title: "Your session is monitored",
                  text: "Your camera and microphone are used throughout. Sit in a quiet, well-lit place, keep your face visible and stay alone in the room.",
                },
                {
                  title: "Do not leave the interview",
                  text: "Do not refresh or close this page. The session may end and cannot be continued. Exiting full screen twice submits it automatically.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3.5 bg-gray-50 rounded-xl px-4 py-3.5">
                  <span className="w-6 h-6 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy mb-0.5">{item.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: setup checklist */}
          <div className="p-8 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 bg-brand-orange rounded-full" />
                <h2 className="font-bold text-navy text-base">Setup Checklist</h2>
              </div>
              <span className="text-sm font-bold text-brand-orange">
                {doneCount}/{totalChecks}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <CheckRow status={browserStatus} label="Browser compatibility" icon={IconMonitor} />
              <CheckRow status={networkStatus} label="Internet connection" icon={IconWifi} />

              <CheckRow status={speakerStatus} label="Speaker test" icon={IconVolume}>
                {speakerStatus !== "done" && (
                  <button
                    onClick={playSpeakerTest}
                    disabled={speakerStatus === "checking"}
                    className="text-[11px] font-semibold text-white bg-navy hover:bg-navy-dark hover:-translate-y-0.5 active:translate-y-0 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {speakerStatus === "checking" ? "Playing..." : "Play test sound"}
                  </button>
                )}
                {speakerStatus === "done" && (
                  <button onClick={playSpeakerTest} className="text-[11px] font-semibold text-gray-400 hover:text-navy transition">
                    Replay
                  </button>
                )}
                <audio ref={speakerAudioRef} className="hidden" />
              </CheckRow>

              <CheckRow
                status={micStatus === "recording" || micStatus === "checking" ? "checking" : micStatus}
                label="Microphone test"
                icon={IconMic}
              >
                {micStatus !== "done" && (
                  <>
                    <p className="text-[11px] text-gray-400 mb-1.5">
                      Say: <span className="text-navy font-semibold">&ldquo;{SAMPLE_PHRASE}&rdquo;</span>
                    </p>
                    {micError && <p className="text-[11px] text-red-500 mb-1.5">{micError}</p>}
                    <button
                      onClick={micStatus === "recording" ? stopMicTest : startMicTest}
                      disabled={micStatus === "checking"}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                        micStatus === "recording"
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-navy text-white hover:bg-navy-dark hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                    >
                      {micStatus === "recording" ? "Stop" : micStatus === "checking" ? "Processing..." : "Speak now"}
                    </button>
                  </>
                )}
                {micStatus === "done" && (
                  <p className="text-[11px] text-gray-500">
                    Heard: <span className="italic">&ldquo;{micTranscript}&rdquo;</span>
                  </p>
                )}
              </CheckRow>

              <CheckRow status={cameraStatus === "checking" ? "checking" : cameraStatus} label="Camera (required)" icon={IconCamera}>
                {cameraStatus === "pending" && (
                  <button
                    onClick={enableWebcam}
                    className="text-[11px] font-semibold text-white bg-navy hover:bg-navy-dark hover:-translate-y-0.5 active:translate-y-0 px-3 py-1.5 rounded-lg transition"
                  >
                    Enable camera
                  </button>
                )}
                {cameraStatus === "done" && (
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-40 h-28 rounded-lg object-cover border border-gray-200 scale-x-[-1]"
                  />
                )}
              </CheckRow>
            </div>

            <div className="flex items-start gap-2.5 bg-orange-light rounded-xl px-4 py-3 mb-3.5">
              <IconAlert className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Starting the interview will enter <span className="font-semibold text-navy">full screen</span>. Exiting once gives
                you a warning — exiting again <span className="font-semibold text-navy">automatically submits</span> your interview.
              </p>
            </div>

            {fullscreenError && <p className="text-xs text-red-500 mb-3 text-center">{fullscreenError}</p>}

            <button
              onClick={handleStart}
              disabled={!allDone || starting}
              className="w-full mt-4 bg-navy hover:bg-navy-dark hover:-translate-y-0.5 active:translate-y-0 text-white py-3.5 rounded-xl font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 shrink-0 flex items-center justify-center gap-2"
              style={{ boxShadow: allDone ? "0 8px 20px -6px rgba(15,27,76,0.45)" : "none" }}
            >
              {starting ? "Starting..." : allDone ? "Start Interview" : "Complete all checks to continue"}
              {allDone && !starting && <IconArrowRight className="w-4 h-4" />}
            </button>

          
          </div>
        </div>
      </div>
    </div>
  );
}