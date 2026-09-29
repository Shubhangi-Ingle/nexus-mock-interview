import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getSubjects } from "../api/student";

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
const IconArrow = (p) => (
  <Svg strokeWidth="2" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

// Picks an icon and a colour for a subject based on its name
function getSubjectMeta(subject) {
  const n = (subject?.name || "").toLowerCase();
  if (subject?.is_resume_based || /resume|project/.test(n)) return { Icon: IconDoc, tile: "bg-orange-50 text-orange-600" };
  if (/\bhr\b|behavio/.test(n)) return { Icon: IconUsers, tile: "bg-emerald-50 text-emerald-600" };
  if (/data|analytic|machine|\bml\b|\bai\b/.test(n)) return { Icon: IconDatabase, tile: "bg-violet-50 text-violet-600" };
  if (/java|python|code|develop|program|sql|web|react|node|c\+\+|dsa/.test(n)) return { Icon: IconCode, tile: "bg-blue-50 text-blue-600" };
  return { Icon: IconBriefcase, tile: "bg-sky-50 text-sky-600" };
}

/* ---------- subject card (the whole card is the button) ---------- */
function SubjectCard({ subject, onSelect }) {
  const { Icon, tile } = getSubjectMeta(subject);
  return (
    <button
      type="button"
      onClick={() => onSelect(subject)}
      className="group text-left flex flex-col w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] bg-white rounded-2xl p-6 border-2 border-slate-200 transition-all hover:border-navy hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-16px_rgba(30,58,138,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${tile}`}>
        <Icon className="w-6 h-6" />
      </span>
      <span className="mt-5 text-lg font-bold text-navy font-display">{subject.name}</span>
      <span className="mt-1.5 text-sm text-slate-500 leading-relaxed line-clamp-3">
        {subject.description ||
          (subject.is_resume_based
            ? "Questions based on your own resume. You will upload it in the next step."
            : "Questions on this subject, asked and evaluated by our AI interviewer.")}
      </span>
      <span className="mt-auto pt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy">
        {subject.is_resume_based ? "Upload resume" : "Start interview"}
        <IconArrow className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (subject) => {
    const state = {
      duration: INTERVIEW_MINUTES,
      subject,
      studentName: user?.name,
      studentEmail: user?.email,
    };
    navigate(subject.is_resume_based ? `/interview/resume/${subject.id}` : `/interview/${subject.id}`, { state });
  };

  return (
    <div className="min-h-screen bg-[#F4F6FA] font-body">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy font-display">Select your interview</h1>
          <p className="mt-3 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
            Choose the subject you would like to be interviewed on. The interview is voice-based and takes about{" "}
            {INTERVIEW_MINUTES} minutes.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[220px] rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !error && subjects.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 text-center">
            <p className="text-sm font-semibold text-navy">No interviews are available yet</p>
            <p className="text-sm text-slate-500 mt-1">Please check back soon.</p>
          </div>
        )}

        {!loading && subjects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-5">
            {subjects.map((s) => (
              <SubjectCard key={s.id} subject={s} onSelect={handleSelect} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}