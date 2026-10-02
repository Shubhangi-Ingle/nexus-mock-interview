import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getReport, getSessionAnswers } from "../api/interview";

export default function InterviewResult() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    const [showReview, setShowReview] = useState(false);

  // Popup: close on Escape and stop the page behind it from scrolling
  useEffect(() => {
    if (!showReview) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowReview(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showReview]);

  useEffect(() => {
    const load = async () => {
      try {
        const [reportRes, answersRes] = await Promise.all([
          getReport(sessionId),
          getSessionAnswers(sessionId),
        ]);
        setReport(reportRes.data);
        setAnswers(answersRes.data);
      } catch (err) {
        setError("Report not ready yet or failed to generate. Please check your history page shortly.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  const scoreTier = (score) => {
    if (score >= 7) return { text: "text-green-600", ring: "#16A34A", bar: "bg-green-500" };
    if (score >= 4) return { text: "text-amber-600", ring: "#D97706", bar: "bg-amber-500" };
    return { text: "text-red-600", ring: "#DC2626", bar: "bg-red-500" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="animate-pulse text-navy font-semibold">Generating your report...</div>
          <p className="text-gray-400 text-sm mt-2">This can take a few seconds while AI evaluates your answers.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate("/dashboard")} className="text-navy font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tier = scoreTier(report.overall_score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(report.overall_score, 10) / 10) * circumference;
  const scored = answers.filter((a) => a.score !== null && a.score !== undefined);
  const best = scored.length ? Math.max(...scored.map((a) => a.score)) : null;
  const weakest = scored.length ? Math.min(...scored.map((a) => a.score)) : null;
  const tierLabel = report.overall_score >= 7 ? "Strong" : report.overall_score >= 4 ? "Fair" : "Needs work";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-navy mb-1">Interview Report</h1>
            <p className="text-gray-500">Here's how you performed.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/history")}
              className="border border-navy text-navy hover:bg-navy-light px-5 py-2.5 rounded-xl font-semibold transition text-sm"
            >
              History
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-navy hover:bg-navy-dark text-white px-5 py-2.5 rounded-xl font-semibold transition text-sm"
            >
              Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Score */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <div className="relative w-40 h-40 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={tier.ring}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${tier.text}`}>{report.overall_score}</span>
                <span className="text-xs text-gray-400 -mt-0.5">out of 10</span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Overall Score</p>
              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full bg-gray-50 ${tier.text}`}>
                {tierLabel}
              </span>
              <p className="text-base text-gray-500 leading-relaxed mt-3">{report.summary}</p>

              <div className="flex justify-center sm:justify-start gap-10 mt-5 pt-5 border-t border-gray-100">
                {[
                  ["Questions", answers.length],
                  ["Best", best !== null ? `${best}/10` : "—"],
                  ["Lowest", weakest !== null ? `${weakest}/10` : "—"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-lg font-bold text-navy">{value}</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strengths */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <p className="text-sm font-semibold text-green-700 mb-2">✓ Strengths</p>
            <p className="text-base text-green-800 leading-relaxed">{report.strengths}</p>
          </div>

          {/* Improvements */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
            <p className="text-sm font-semibold text-orange-700 mb-2">↗ Areas to Improve</p>
            <p className="text-base text-orange-800 leading-relaxed">{report.improvements}</p>
          </div>

          <button
            onClick={() => setShowReview(true)}
            className="w-full bg-navy hover:bg-navy-dark text-white py-4 rounded-2xl font-semibold transition"
          >
            Review questions &amp; answers ({answers.length})
          </button>
        </div>
      </div>

      {/* Popup with every question and answer */}
      {showReview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReview(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Questions and answers"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-navy text-lg">Your Answers</h2>
                <p className="text-xs text-gray-400">{answers.length} questions</p>
              </div>
              <button
                onClick={() => setShowReview(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-4">
              {answers.map((a, idx) => {
                const qTier = scoreTier(a.score || 0);
                return (
                  <div
                    key={a.id}
                    className="relative bg-white border border-gray-200 rounded-2xl pl-7 pr-5 py-5 overflow-hidden"
                  >
                    <span className={`absolute left-0 top-0 h-full w-1.5 ${qTier.bar}`} />

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-navy-light text-navy text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-base font-semibold text-navy pt-0.5">{a.question_text}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 px-2.5 py-1 rounded-full bg-gray-50 ${qTier.text}`}>
                        {a.score !== null ? `${a.score}/10` : "—"}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Your answer</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {a.answer_text || <em className="text-gray-400">No answer provided</em>}
                      </p>
                    </div>

                    {a.feedback && (
                      <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Feedback</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{a.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}