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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-navy mb-1">Interview Report</h1>
        <p className="text-gray-500 mb-8">Here's how you performed.</p>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">
          {/* Sidebar: score + summary + actions */}
          <div className="space-y-5">
            {/* Score ring card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">
                Overall Score
              </p>

              <div className="relative w-32 h-32 mx-auto mb-5">
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
                  <span className={`text-3xl font-bold ${tier.text}`}>{report.overall_score}</span>
                  <span className="text-xs text-gray-400 -mt-0.5">out of 10</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed">{report.summary}</p>
            </div>

            {/* Strengths */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-green-700 mb-2">✓ Strengths</p>
              <p className="text-sm text-green-800 leading-relaxed">{report.strengths}</p>
            </div>

            {/* Improvements */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-orange-700 mb-2">↗ Areas to Improve</p>
              <p className="text-sm text-orange-800 leading-relaxed">{report.improvements}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex-1 bg-navy hover:bg-navy-dark text-white py-3 rounded-xl font-semibold transition text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/history")}
                className="flex-1 border border-navy text-navy hover:bg-navy-light py-3 rounded-xl font-semibold transition text-sm"
              >
                History
              </button>
            </div>
          </div>

          {/* Question breakdown */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy text-lg">Question Breakdown</h2>
              <span className="text-xs text-gray-400 font-medium">{answers.length} questions</span>
            </div>

            <div className="space-y-4">
              {answers.map((a, idx) => {
                const qTier = scoreTier(a.score || 0);
                return (
                  <div
                    key={a.id}
                    className="relative bg-white border border-gray-200 rounded-2xl pl-7 pr-6 py-5 shadow-sm overflow-hidden"
                  >
                    <span className={`absolute left-0 top-0 h-full w-1.5 ${qTier.bar}`} />

                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-navy-light text-navy text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm font-semibold text-navy pt-1">{a.question_text}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 px-2.5 py-1 rounded-full bg-gray-50 ${qTier.text}`}>
                        {a.score !== null ? `${a.score}/10` : "—"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 mb-2 pl-10">
                      <span className="font-medium text-gray-600">Your answer: </span>
                      {a.answer_text || <em className="text-gray-400">No answer provided</em>}
                    </p>

                    {a.feedback && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-2 ml-10">
                        💬 {a.feedback}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}