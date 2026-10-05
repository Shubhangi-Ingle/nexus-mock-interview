import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getSubjects } from "../api/student";
import { getHistory } from "../api/interview";

// Testing: 5-minute interviews. Set TESTING_MODE to false for the real 30 minutes.
const TESTING_MODE = true;
const INTERVIEW_MINUTES = TESTING_MODE ? 5 : 30;

/* ---------- icons ---------- */
const Svg = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconCode = (p) => (
  <Svg {...p}>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
  </Svg>
);
const IconUsers = (p) => (
  <Svg {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    <circle cx="10" cy="7" r="4" />
  </Svg>
);
const IconDoc = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6" />
  </Svg>
);
const IconDatabase = (p) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </Svg>
);
const IconBriefcase = (p) => (
  <Svg {...p}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
  </Svg>
);
const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Svg>
);
const IconTrophy = (p) => (
  <Svg {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
  </Svg>
);
const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
const IconTrend = (p) => (
  <Svg {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);
const IconHistory = (p) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    <path d="M12 8v4l3 2" />
  </Svg>
);
const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
const IconMoon = (p) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </Svg>
);

/* ---------- helpers ---------- */
function getSubjectMeta(subject) {
  const n = (subject?.name || "").toLowerCase();
  if (subject?.is_resume_based || /resume|project/.test(n)) return { Icon: IconDoc, tile: "bg-orange-50 text-orange-600" };
  if (/\bhr\b|behavio/.test(n)) return { Icon: IconUsers, tile: "bg-emerald-50 text-emerald-600" };
  if (/data|analytic|machine|\bml\b|\bai\b/.test(n)) return { Icon: IconDatabase, tile: "bg-violet-50 text-violet-600" };
  if (/java|python|code|develop|program|sql|web|react|node|c\+\+|dsa/.test(n)) return { Icon: IconCode, tile: "bg-blue-50 text-blue-600" };
  return { Icon: IconBriefcase, tile: "bg-sky-50 text-sky-600" };
}

const fmtScore = (n) => Number(Number(n).toFixed(1));

function scoreTone(score) {
  if (score >= 7) return "text-emerald-700 bg-emerald-50";
  if (score >= 4) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function relativeDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function sessionMinutes(s) {
  if (s.started_at && s.ended_at) {
    const m = Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 60000);
    if (m >= 0) return Math.min(m, s.duration_minutes);
  }
  return s.duration_minutes || 0;
}

const HOW_IT_WORKS = [
  { title: "Pick an interview", text: "Choose a subject from the list." },
  { title: "Answer out loud", text: "The AI interviewer asks each question and listens to you." },
  { title: "Get your report", text: "See your score and feedback as soon as you finish." },
];

/* ---------- stat ---------- */
function Stat({ icon: Icon, label, value, bg, iconColor }) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col justify-between gap-4 min-h-[104px] ${bg}`}>
      <span className={`w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center ${iconColor}`}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-bold text-navy leading-tight truncate">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ---------- subject card ---------- */
function SubjectCard({ subject, onSelect, attempts, best }) {
  const { Icon, tile } = getSubjectMeta(subject);

  if (subject.is_resume_based) {
    return (
      <button
        type="button"
        onClick={() => onSelect(subject)}
        className="group sm:col-span-2 w-full flex items-center gap-4 text-left rounded-2xl p-5 border border-orange-200 bg-gradient-to-r from-orange-light to-white transition hover:border-brand-orange hover:shadow-[0_10px_24px_-14px_rgba(249,115,22,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
      >
        <span className="w-12 h-12 rounded-xl bg-brand-orange text-white flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-bold text-navy font-display leading-snug">{subject.name}</span>
          <span className="block mt-0.5 text-sm text-slate-500">Upload your resume and get questions made for you</span>
        </span>
        <span className="shrink-0 flex items-center gap-3">
          {best !== null && (
            <span className={`hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-full ${scoreTone(best)}`}>Best {fmtScore(best)}/10</span>
          )}
          <span className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-sm font-semibold px-4 py-2 rounded-xl group-hover:bg-orange-dark transition-colors">
            Upload resume <span aria-hidden="true">→</span>
          </span>
        </span>
      </button>
    );
  }

  const meta =
    attempts > 0
      ? `Taken ${attempts} ${attempts === 1 ? "time" : "times"}`
      : subject.is_resume_based
        ? "Upload your resume"
        : "Not taken yet";
  return (
    <button
      type="button"
      onClick={() => onSelect(subject)}
      className="group w-full flex flex-col bg-white rounded-2xl p-4 text-left border border-slate-200 transition hover:border-navy/40 hover:shadow-[0_8px_20px_-12px_rgba(30,58,138,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
          <Icon className="w-5 h-5" />
        </span>
        {best !== null && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreTone(best)}`}>Best {fmtScore(best)}/10</span>
        )}
      </span>
      <span className="mt-3 text-[15px] font-bold text-navy font-display leading-snug">{subject.name}</span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">{meta}</span>
        <span className="text-sm font-semibold text-navy group-hover:text-brand-orange transition-colors">
          {subject.is_resume_based ? "Upload" : "Start"}
        </span>
      </span>
    </button>
  );
}

/* ---------- page ---------- */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSubjects()
      .then((res) => {
        if (!cancelled) setSubjects(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load the interview list. Refresh the page to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getHistory()
      .then((res) => {
        if (!cancelled) setHistory(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const completed = history.filter((s) => s.status === "completed");
    const scored = completed.filter((s) => s.overall_score !== null && s.overall_score !== undefined);
    const average = scored.length ? scored.reduce((sum, s) => sum + s.overall_score, 0) / scored.length : null;
    const best = scored.length ? Math.max(...scored.map((s) => s.overall_score)) : null;
    const minutes = completed.reduce((sum, s) => sum + sessionMinutes(s), 0);
    const lastCompleted = completed[0] || null; // API returns newest first

    const perSubject = {};
    history.forEach((s) => {
      const entry = (perSubject[s.subject_id] ||= { attempts: 0, best: null });
      if (s.status !== "completed") return;
      entry.attempts += 1;
      if (s.overall_score !== null && s.overall_score !== undefined) {
        entry.best = entry.best === null ? s.overall_score : Math.max(entry.best, s.overall_score);
      }
    });

    return { completedCount: completed.length, average, best, minutes, lastCompleted, perSubject };
  }, [history]);

  const handleSelect = (subject) => {
    const state = {
      duration: INTERVIEW_MINUTES,
      subject,
      studentName: user?.name,
      studentEmail: user?.email,
    };
    navigate(subject.is_resume_based ? `/interview/resume/${subject.id}` : `/interview/${subject.id}`, { state });
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "there";
  const heroLine = historyLoading
    ? "Loading your progress."
    : stats.completedCount === 0
      ? "Pick a subject and take your first voice interview."
      : `You have completed ${stats.completedCount} ${stats.completedCount === 1 ? "interview" : "interviews"}. Pick a subject to keep practicing.`;

  const lastDone = stats.lastCompleted;
  const lastMeta = getSubjectMeta(lastDone ? subjects.find((s) => s.id === lastDone.subject_id) || { name: lastDone.subject_name } : null);
  const LastIcon = lastMeta.Icon;
  const lastHasScore = lastDone && lastDone.overall_score !== null && lastDone.overall_score !== undefined;

  return (
    <div className="min-h-screen flex flex-col bg-white font-body">
      <Navbar />

      <main className="relative overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">

        {/* Left: greeting and progress */}
        <section className="relative flex flex-col justify-start px-6 sm:px-10 lg:px-14 xl:px-20 pt-8 pb-10 lg:pt-10 lg:pb-14 bg-gradient-to-br from-blue-100 via-indigo-50 to-orange-100">
          <div className="relative w-full max-w-2xl mx-auto lg:mx-0">
            <span className="inline-flex items-center gap-2 bg-white/70 border border-white text-navy text-sm font-semibold pl-2.5 pr-3.5 py-1.5 rounded-full shadow-sm">
              {new Date().getHours() >= 17 ? <IconMoon className="w-4 h-4 text-indigo-500" /> : <IconSun className="w-4 h-4 text-amber-500" />}
              {greetingFor()}
            </span>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-navy">{firstName}</h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-lg">{heroLine}</p>

            {/* Your numbers */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              {historyLoading ? (
                [0, 1, 2, 3].map((i) => <div key={i} className="rounded-2xl min-h-[104px] bg-slate-200/60 animate-pulse" />)
              ) : (
                <>
                  <Stat icon={IconCheckCircle} label="Completed" value={stats.completedCount} bg="bg-emerald-50" iconColor="text-emerald-600" />
                  <Stat icon={IconTrend} label="Average score" value={stats.average !== null ? `${fmtScore(stats.average)}/10` : "None yet"} bg="bg-sky-50" iconColor="text-sky-600" />
                  <Stat icon={IconTrophy} label="Best score" value={stats.best !== null ? `${fmtScore(stats.best)}/10` : "None yet"} bg="bg-amber-50" iconColor="text-amber-600" />
                  <Stat icon={IconClock} label="Total time" value={stats.minutes > 0 ? `${stats.minutes} min` : "None yet"} bg="bg-violet-50" iconColor="text-violet-600" />
                </>
              )}
            </div>

            {/* Last interview, or a short guide for new candidates */}
            {historyLoading ? (
              <div className="mt-6 rounded-2xl h-[150px] bg-slate-200/60 animate-pulse" />
            ) : lastDone ? (
              <div className="mt-6 rounded-2xl bg-white/70 border border-white p-5">
                <p className="text-xs font-semibold text-slate-500 mb-3">Your last interview</p>
                <div className="flex items-center gap-4">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${lastMeta.tile}`}>
                    <LastIcon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-navy font-display truncate">{lastDone.subject_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{relativeDate(lastDone.started_at)}</p>
                  </div>
                  {lastHasScore && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${scoreTone(lastDone.overall_score)}`}>
                      {fmtScore(lastDone.overall_score)}/10
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/interview/${lastDone.id}/result`)}
                  className="mt-4 w-full bg-white border border-navy/20 text-navy text-sm font-semibold py-2.5 rounded-xl hover:bg-navy hover:text-white hover:border-navy transition"
                >
                  View report
                </button>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-white/70 border border-white p-5">
                <p className="text-xs font-semibold text-slate-500 mb-4">How it works</p>
                <ol className="space-y-3.5">
                  {HOW_IT_WORKS.map((step, i) => (
                    <li key={step.title} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy leading-tight">{step.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate("/history")}
              className="mt-6 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-navy-dark active:scale-[0.98] transition"
            >
              <IconHistory className="w-4 h-4" />
              View history
            </button>
          </div>
        </section>

        {/* Right: choose an interview */}
        <section id="subjects" className="relative flex flex-col justify-start px-6 sm:px-10 lg:px-14 xl:px-20 pt-8 pb-10 lg:pt-10 lg:pb-14 bg-slate-50 lg:border-l lg:border-slate-200">
          <div className="w-full max-w-2xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-navy">Choose an interview</h2>
            <p className="mt-1.5 mb-6 text-sm text-slate-500">
              Each interview is voice-based and takes about {INTERVIEW_MINUTES} minutes.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[112px] rounded-2xl bg-slate-200/60 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && !error && subjects.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 text-center">
                <p className="text-sm font-semibold text-navy">No interviews are available yet</p>
                <p className="text-sm text-slate-500 mt-1">Your admin has not added any subjects. Check back soon.</p>
              </div>
            )}

            {!loading && subjects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...subjects].sort((a, b) => Number(!!b.is_resume_based) - Number(!!a.is_resume_based)).map((s) => (
                  <SubjectCard
                    key={s.id}
                    subject={s}
                    onSelect={handleSelect}
                    attempts={stats.perSubject[s.id]?.attempts || 0}
                    best={stats.perSubject[s.id]?.best ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}