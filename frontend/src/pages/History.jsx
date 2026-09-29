import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getHistory, deleteSession } from "../api/interview";

const subjectIcon = (name) => {
    const key = name.toLowerCase();
    if (key.includes("java")) return "☕";
    if (key.includes("python")) return "🐍";
    if (key.includes("sql")) return "🗄️";
    if (key.includes("resume")) return "📄";
    if (key.includes("hr")) return "🧑‍💼";
    return "💡";
};

const scoreColor = (score) => {
    if (score === null || score === undefined) return "text-gray-400";
    if (score >= 7) return "text-green-600";
    if (score >= 4) return "text-yellow-600";
    return "text-red-600";
};

const statusBadge = (status) => {
    if (status === "completed") return "bg-green-50 text-green-600 border border-green-200";
    if (status === "in_progress") return "bg-yellow-50 text-yellow-600 border border-yellow-200";
    if (status === "abandoned") return "bg-gray-100 text-gray-500 border border-gray-200";
    return "bg-gray-50 text-gray-500 border border-gray-200";
};

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
);

export default function History() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirmId, setConfirmId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getHistory();
                setSessions(res.data);
            } catch (err) {
                setError("Failed to load history.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) +
            " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await deleteSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            setError("Failed to delete this interview. Please try again.");
        } finally {
            setDeletingId(null);
            setConfirmId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-4xl mx-auto px-6 py-10">
    <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-5 transition"
    >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
    </button>
    <div className="flex items-end justify-between mb-8 flex-wrap gap-2">
        <div>
            <h1 className="text-3xl font-bold text-navy mb-1">Interview History</h1>
                        <p className="text-gray-500">Review your past mock interviews and reports.</p>
                    </div>
                    {!loading && sessions.length > 0 && (
                        <p className="text-sm text-gray-400 font-medium">
                            {sessions.length} interview{sessions.length !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}

                {loading ? (
                    <p className="text-gray-400">Loading history...</p>
                ) : sessions.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                        <p className="text-gray-400 mb-4">You haven't taken any interviews yet.</p>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="text-navy font-semibold hover:underline"
                        >
                            Start your first interview →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((s) => (
                            <div
                                key={s.id}
                                className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:shadow-sm hover:border-navy/20 transition"
                            >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-11 h-11 rounded-xl bg-navy-light flex items-center justify-center text-xl shrink-0">
                                        {subjectIcon(s.subject_name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="font-semibold text-navy truncate">{s.subject_name}</p>
                                            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${statusBadge(s.status)}`}>
                                                {s.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            {formatDate(s.started_at)} · {s.duration_minutes} min
                                        </p>
                                    </div>
                                </div>

                                {confirmId === s.id ? (
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:inline">
                                            Delete this interview?
                                        </span>
                                        <button
                                            onClick={() => setConfirmId(null)}
                                            disabled={deletingId === s.id}
                                            className="text-sm font-semibold text-gray-500 hover:text-navy px-3 py-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            disabled={deletingId === s.id}
                                            className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {deletingId === s.id ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 shrink-0">
                                        {s.status === "completed" && s.overall_score !== null && (
                                            <div className="text-right">
                                                <p className={`text-lg font-bold ${scoreColor(s.overall_score)}`}>
                                                    {s.overall_score}<span className="text-xs text-gray-300">/10</span>
                                                </p>
                                            </div>
                                        )}
                                        {s.status === "completed" ? (
                                            <button
                                                onClick={() => navigate(`/interview/${s.id}/result`)}
                                                className="text-sm font-semibold text-navy hover:underline whitespace-nowrap"
                                            >
                                                View Report →
                                            </button>
                                        ) : (
                                            <span className="text-sm text-gray-300 whitespace-nowrap">
                                                {s.status === "abandoned" ? "Not completed" : "In progress"}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => setConfirmId(s.id)}
                                            aria-label="Delete interview"
                                            className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}