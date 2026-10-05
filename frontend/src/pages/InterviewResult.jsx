import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getReport, getSessionAnswers, getHistory } from "../api/interview";

/* ---------- icons ---------- */
const Svg = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconChevronLeft = (p) => (
  <Svg strokeWidth="2" {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
);
const IconChevronDown = (p) => (
  <Svg strokeWidth="2" {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

/* ---------- helpers ---------- */
const fmt = (n) => Number(Number(n).toFixed(1));

function tier(score) {
  if (score >= 7) return { chip: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", onDark: "text-emerald-300", label: "Strong performance" };
  if (score >= 4) return { chip: "bg-amber-50 text-amber-700", bar: "bg-amber-500", onDark: "text-amber-300", label: "Room to improve" };
  return { chip: "bg-red-50 text-red-700", bar: "bg-red-500", onDark: "text-red-300", label: "Needs more practice" };
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
const formatTime = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Split a short paragraph into sentences so it reads as a list
const toPoints = (text) =>
  (text || "")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);

const hasAnswer = (a) => !!(a.answer_text && a.answer_text.trim());

// faint grid that fades out towards the bottom of the navy header
const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
  maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
  WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
};

/* ---------- small pieces ---------- */
function InsightCard({ title, text, accent, dot }) {
  const points = toPoints(text);
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${accent} p-5`}>
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      {points.length > 1 ? (
        <ul className="mt-3 space-y-2.5">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
              {p}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{text}</p>
      )}
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-[#F4F6FA] font-body">
      <Navbar />
      {children}
    </div>
  );
}

export default function InterviewResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [meta, setMeta] = useState(null); // subject, date and duration from history (optional)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openIds, setOpenIds] = useState(new Set());
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reportRes, answersRes, historyRes] = await Promise.allSettled([
        getReport(sessionId),
        getSessionAnswers(sessionId),
        getHistory(),
      ]);
      if (reportRes.status !== "fulfilled" || answersRes.status !== "fulfilled") throw new Error("not ready");

      const list = answersRes.value.data || [];
      setReport(reportRes.value.data);
      setAnswers(list);
      setOpenIds(list.length <= 5 ? new Set(list.map((a) => a.id)) : new Set(list[0] ? [list[0].id] : []));
      if (historyRes.status === "fulfilled") {
        setMeta((historyRes.value.data || []).find((h) => h.id === sessionId) || null);
      }
    } catch (err) {
      setError("This report isn't ready yet, or it couldn't be generated.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // let the score bar fill in once, after the data is on screen
  useEffect(() => {
    if (!report) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [report]);

  const facts = useMemo(() => {
    const scored = answers.map((a, i) => ({ i, score: a.score })).filter((x) => x.score !== null && x.score !== undefined);
    const top = scored.length ? scored.reduce((best, x) => (x.score > best.score ? x : best)) : null;
    return {
      questions: answers.length,
      answered: answers.filter(hasAnswer).length,
      top,
    };
  }, [answers]);

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen = answers.length > 0 && openIds.size === answers.length;
  const toggleAll = () => setOpenIds(allOpen ? new Set() : new Set(answers.map((a) => a.id)));

  const jumpTo = (i) => {
    const a = answers[i];
    if (!a) return;
    setOpenIds((prev) => new Set(prev).add(a.id));
    requestAnimationFrame(() => document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  if (loading) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto px-6 py-28 text-center">
          <span className="block w-9 h-9 mx-auto rounded-full border-[3px] border-slate-200 border-t-navy animate-spin" />
          <p className="mt-5 font-display text-lg font-semibold text-navy">Preparing your report</p>
          <p className="mt-1.5 text-sm text-slate-500">This can take a few seconds while the AI reviews your answers.</p>
        </div>
      </PageShell>
    );
  }

  if (error || !report) {
    return (
      <PageShell>
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="font-display text-lg font-semibold text-navy">We couldn't open this report</p>
          <p className="mt-1.5 text-sm text-slate-500">{error || "Something went wrong."} You can try again, or check your history in a moment.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={load}
              className="bg-navy hover:bg-navy-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="text-sm font-semibold text-navy border border-slate-300 hover:bg-white px-5 py-2.5 rounded-xl transition-colors"
            >
              Go to history
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const score = Number(report.overall_score) || 0;
  const t = tier(score);
  const when = meta?.started_at || report.generated_at;
  const dateLine = [when ? `${formatDate(when)}, ${formatTime(when)}` : null, meta?.duration_minutes ? `${meta.duration_minutes} min` : null]
    .filter(Boolean)
    .join("  |  ");

  return (
    <PageShell>
      {/* Header */}
      <section className="relative overflow-hidden bg-navy-dark">
        <div className="pointer-events-none absolute inset-0" style={GRID_STYLE} aria-hidden="true" />
        <div className="relative max-w-6xl mx-auto px-6 pt-7 pb-12">
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="inline-flex items-center gap-1 text-sm font-medium text-white/60 hover:text-white transition-colors"
          >
            <IconChevronLeft className="w-4 h-4" />
            Back to history
          </button>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 items-center">
            <div>
              <span className="block w-10 h-1 rounded-full bg-brand-orange mb-5" aria-hidden="true" />
              <p className="text-sm font-medium text-white/60">Interview report</p>
              <h1 className="mt-1 font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-white">
                {meta?.subject_name || "Mock interview"}
              </h1>
              {dateLine && <p className="mt-2 text-sm text-white/55 whitespace-pre">{dateLine}</p>}

              {report.summary && <p className="mt-5 text-[15px] text-white/75 leading-relaxed max-w-xl">{report.summary}</p>}

              <div className="mt-8 grid grid-cols-3 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10 max-w-xl">
                <div className="bg-navy-dark px-4 py-3.5">
                  <p className="text-xs text-white/55">Questions</p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-white tabular-nums leading-none">{facts.questions}</p>
                </div>
                <div className="bg-navy-dark px-4 py-3.5">
                  <p className="text-xs text-white/55">Answered</p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-white tabular-nums leading-none">
                    {facts.answered}
                    <span className="text-sm font-medium text-white/40">/{facts.questions}</span>
                  </p>
                </div>
                <div className="bg-navy-dark px-4 py-3.5">
                  <p className="text-xs text-white/55">Top score</p>
                  <p className="mt-1.5 font-display text-xl font-semibold text-white tabular-nums leading-none">
                    {facts.top ? fmt(facts.top.score) : <span className="text-white/30">–</span>}
                    {facts.top && <span className="text-sm font-medium text-white/40"> on Q{facts.top.i + 1}</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Score panel */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <p className="text-sm text-white/60">Overall score</p>
              <p className="mt-2 font-display text-6xl font-semibold text-white tabular-nums leading-none">
                {fmt(score)}
                <span className="text-2xl font-medium text-white/40">/10</span>
              </p>
              <p className={`mt-3 text-sm font-semibold ${t.onDark}`}>{t.label}</p>

              <div className="mt-6">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-orange transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                    style={{ width: ready ? `${Math.min(score, 10) * 10}%` : "0%" }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-white/40 tabular-nums">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* Main column */}
        <div className="order-2 lg:order-1 space-y-6 min-w-0">
          {answers.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6" aria-labelledby="chart-heading">
              <h2 id="chart-heading" className="font-display text-base font-semibold text-navy">
                Score by question
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Select a bar to jump to that question.</p>

              <div className="mt-5 flex items-end justify-center gap-2 sm:gap-3">
                {answers.map((a, i) => {
                  const has = a.score !== null && a.score !== undefined;
                  const bt = tier(a.score || 0);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => jumpTo(i)}
                      aria-label={`Question ${i + 1}, score ${has ? fmt(a.score) : "not scored"}`}
                      className="group flex-1 max-w-[56px] min-w-0 flex flex-col items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy rounded-md"
                    >
                      <span className="text-[11px] font-semibold text-slate-600 tabular-nums">{has ? fmt(a.score) : "–"}</span>
                      <span className="relative w-full h-24 rounded-md bg-slate-100 overflow-hidden group-hover:bg-slate-200 transition-colors">
                        <span
                          className={`absolute bottom-0 inset-x-0 rounded-md transition-[height] duration-700 ease-out motion-reduce:transition-none ${bt.bar}`}
                          style={{ height: ready && has ? `${Math.min(a.score, 10) * 10}%` : "0%" }}
                        />
                      </span>
                      <span className="text-[11px] text-slate-400">Q{i + 1}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="breakdown-heading">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 id="breakdown-heading" className="font-display text-lg font-semibold text-navy">
                Question breakdown
              </h2>
              {answers.length > 1 && (
                <button type="button" onClick={toggleAll} className="text-sm font-semibold text-navy hover:underline">
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>

            {answers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl px-6 py-12 text-center text-sm text-slate-500">
                No answers were recorded for this interview.
              </div>
            ) : (
              <ul className="space-y-3">
                {answers.map((a, idx) => {
                  const has = a.score !== null && a.score !== undefined;
                  const qt = tier(a.score || 0);
                  const isOpen = openIds.has(a.id);
                  return (
                    <li key={a.id} id={`q-${idx}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-mt-6">
                      <button
                        type="button"
                        onClick={() => toggle(a.id)}
                        aria-expanded={isOpen}
                        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="mt-0.5 w-7 h-7 rounded-full bg-slate-100 text-navy text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0 text-[15px] font-semibold text-navy leading-snug pt-0.5">{a.question_text}</span>
                        <span className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full ${
                              has ? qt.chip : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {has ? `${fmt(a.score)}/10` : "Not scored"}
                          </span>
                          <IconChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 sm:pl-[68px] space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1.5">Your answer</p>
                            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-700 leading-relaxed">
                              {hasAnswer(a) ? a.answer_text : <span className="italic text-slate-400">No answer provided</span>}
                            </div>
                          </div>
                          {a.feedback && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5">Feedback</p>
                              <p className="border-l-2 border-navy pl-4 text-sm text-slate-700 leading-relaxed">{a.feedback}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-6">
          <InsightCard title="Strengths" text={report.strengths} accent="border-l-emerald-500" dot="bg-emerald-500" />
          <InsightCard title="Areas to improve" text={report.improvements} accent="border-l-amber-500" dot="bg-amber-500" />

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-navy">What's next</h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Practice again to improve your score, or review your earlier interviews.</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full bg-navy hover:bg-navy-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Practice again
              </button>
              <button
                type="button"
                onClick={() => navigate("/history")}
                className="w-full text-navy text-sm font-semibold py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                View history
              </button>
            </div>
          </div>
        </aside>
      </main>
    </PageShell>
  );
}