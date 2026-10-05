import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getHistory, deleteSession } from "../api/interview";

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
const IconTrash = (p) => (
    <Svg {...p}>
        <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Svg>
);

/* ---------- helpers ---------- */
function getSubjectMeta(name = "") {
    const n = name.toLowerCase();
    if (/resume|project/.test(n)) return { Icon: IconDoc, tile: "bg-orange-50 text-orange-600" };
    if (/\bhr\b|behavio/.test(n)) return { Icon: IconUsers, tile: "bg-emerald-50 text-emerald-600" };
    if (/data|analytic|machine|\bml\b|\bai\b/.test(n)) return { Icon: IconDatabase, tile: "bg-violet-50 text-violet-600" };
    if (/java|python|code|develop|program|sql|web|react|node|c\+\+|dsa/.test(n)) return { Icon: IconCode, tile: "bg-blue-50 text-blue-600" };
    return { Icon: IconBriefcase, tile: "bg-sky-50 text-sky-600" };
}

const scoreColor = (score) => {
    if (score === null || score === undefined) return "text-slate-400";
    if (score >= 7) return "text-emerald-600";
    if (score >= 4) return "text-amber-600";
    return "text-red-600";
};

const fmtScore = (n) => Number(Number(n).toFixed(1));

const statusInfo = (status) => {
    if (status === "completed") return { label: "Completed", cls: "bg-emerald-50 text-emerald-700" };
    if (status === "in_progress") return { label: "In progress", cls: "bg-amber-50 text-amber-700" };
    return { label: "Not completed", cls: "bg-slate-100 text-slate-500" };
};

export default function History() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [confirmId, setConfirmId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [filter, setFilter] = useState("all");
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
        const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
        const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
        const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        if (days <= 0) return `Today · ${time}`;
        if (days === 1) return `Yesterday · ${time}`;
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) + " · " + time;
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

    const completed = sessions.filter((s) => s.status === "completed");
    const scored = completed.filter((s) => s.overall_score !== null && s.overall_score !== undefined);
    const average = scored.length ? scored.reduce((sum, s) => sum + s.overall_score, 0) / scored.length : null;
    const best = scored.length ? Math.max(...scored.map((s) => s.overall_score)) : null;
    const notCompleted = sessions.length - completed.length;
    const visible =
        filter === "completed" ? completed : filter === "not_completed" ? sessions.filter((s) => s.status !== "completed") : sessions;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-light via-white to-orange-light">
            <Navbar />
            <div className="w-full px-6 sm:px-10 lg:px-14 xl:px-20 py-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-navy mb-5 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>

                <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
                    <div>
                        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-navy">Interview History</h1>
                        <p className="mt-2 text-slate-500">Review your past mock interviews and reports.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
                )}

                {!loading && sessions.length > 0 && (
                    <>
                        <div className="grid grid-cols-3 gap-3 mb-5">
                            <div className="rounded-2xl bg-sky-50 p-4">
                                <p className="font-display text-xl font-bold text-navy leading-tight">{sessions.length}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Interviews</p>
                            </div>
                            <div className="rounded-2xl bg-orange-50 p-4">
                                <p className="font-display text-xl font-bold text-navy leading-tight">
                                    {average !== null ? `${fmtScore(average)}/10` : "None yet"}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">Average score</p>
                            </div>
                            <div className="rounded-2xl bg-amber-50 p-4">
                                <p className="font-display text-xl font-bold text-navy leading-tight">
                                    {best !== null ? `${fmtScore(best)}/10` : "None yet"}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">Best score</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-5">
                            {[
                                ["all", "All", sessions.length],
                                ["completed", "Completed", completed.length],
                                ["not_completed", "Not completed", notCompleted],
                            ].map(([key, label, count]) => (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition ${
                                        filter === key
                                            ? "bg-navy text-white border-navy"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-navy/40"
                                    }`}
                                >
                                    {label} ({count})
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {loading ? (
                    <div className="space-y-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="h-[84px] rounded-2xl bg-slate-200/60 animate-pulse" />
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-2xl px-6 py-12 text-center">
                        <p className="text-slate-500 mb-4">You haven't taken any interviews yet.</p>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="text-navy font-semibold hover:underline"
                        >
                            Start your first interview →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visible.length === 0 && (
                            <div className="bg-white border border-dashed border-slate-300 rounded-2xl px-6 py-10 text-center">
                                <p className="text-slate-500 mb-3">No interviews in this view.</p>
                                <button onClick={() => setFilter("all")} className="text-navy font-semibold hover:underline">
                                    Show all interviews
                                </button>
                            </div>
                        )}
                        {visible.map((s) => {
                            const { Icon, tile } = getSubjectMeta(s.subject_name);
                            const status = statusInfo(s.status);
                            const done = s.status === "completed";
                            return (
                                <div
                                    key={s.id}
                                    onClick={done ? () => navigate(`/interview/${s.id}/result`) : undefined}
                                    className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition ${
                                        done ? "cursor-pointer hover:border-navy/40 hover:shadow-[0_8px_20px_-12px_rgba(30,58,138,0.35)]" : ""
                                    }`}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tile}`}>
                                            <Icon className="w-5 h-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <p className="font-display font-bold text-navy truncate">{s.subject_name}</p>
                                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.cls}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {formatDate(s.started_at)} · {s.duration_minutes} min
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {confirmId === s.id ? (
                                            <>
                                                <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:inline">
                                                    Delete this interview?
                                                </span>
                                                <button
                                                    onClick={() => setConfirmId(null)}
                                                    disabled={deletingId === s.id}
                                                    className="text-sm font-semibold text-slate-500 hover:text-navy px-3 py-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
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
                                            </>
                                        ) : (
                                            <>
                                                {done && s.overall_score !== null && s.overall_score !== undefined && (
                                                    <p className={`text-lg font-bold mr-1 ${scoreColor(s.overall_score)}`}>
                                                        {s.overall_score}
                                                        <span className="text-xs font-medium text-slate-300">/10</span>
                                                    </p>
                                                )}
                                                {done ? (
                                                    <button
                                                        onClick={() => navigate(`/interview/${s.id}/result`)}
                                                        className="text-sm font-semibold text-navy border border-slate-300 hover:border-navy hover:bg-navy-light px-4 py-2 rounded-xl transition whitespace-nowrap"
                                                    >
                                                        View report →
                                                    </button>
                                                ) : (
                                                    <span className="text-sm text-slate-400 whitespace-nowrap">
                                                        {s.status === "in_progress" ? "In progress" : "No report"}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => setConfirmId(s.id)}
                                                    aria-label="Delete interview"
                                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                                >
                                                    <IconTrash className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}