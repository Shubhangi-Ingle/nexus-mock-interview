import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  getSubjects,
  getQuestionsBySubject,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../api/admin";

const difficultyStyles = {
  easy: "bg-green-50 text-green-600 border border-green-200",
  medium: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  hard: "bg-red-50 text-red-600 border border-red-200",
};

export default function AdminQuestions() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("medium");
  const [editIsIntro, setEditIsIntro] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, questionsRes] = await Promise.all([
        getSubjects(),
        getQuestionsBySubject(subjectId),
      ]);
      const found = subjectsRes.data.find((s) => s.id === subjectId);
      setSubject(found);
      setQuestions(questionsRes.data);
    } catch (err) {
      setError("Failed to load questions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const handleBulkAdd = async (e) => {
    e.preventDefault();
    setError("");

    // Split on blank lines so a question can wrap across multiple lines.
    // Separate questions with an empty line between them.
    const questionsToAdd = bulkText
      .split(/\n\s*\n/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .filter((block) => block.length > 0);

    if (questionsToAdd.length === 0) {
      setError("Enter at least one question. Separate multiple questions with a blank line.");
      return;
    }

    setSubmitting(true);
    try {
      for (const q of questionsToAdd) {
        await createQuestion({
          subject_id: subjectId,
          question_text: q,
          difficulty,
        });
      }
      setBulkText("");
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add some questions.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditText(q.question_text);
    setEditDifficulty(q.difficulty);
    setEditIsIntro(q.is_intro_question || false);
  };

  const handleEditSave = async (id) => {
    if (!editText.trim()) return;
    try {
      await updateQuestion(id, {
        question_text: editText,
        difficulty: editDifficulty,
        is_intro_question: editIsIntro,
      });
      setEditingId(null);
      loadData();
    } catch (err) {
      alert("Failed to update question.");
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError("Failed to delete question.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy mb-5 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Subjects
        </button>

        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-navy">
            {subject ? subject.name : "Loading..."}
          </h1>
          {subject?.is_resume_based && (
            <span className="text-[10px] bg-orange-light text-brand-orange font-semibold px-2 py-1 rounded-full">
              Resume Based
            </span>
          )}
        </div>
        <p className="text-gray-500 mb-8">Manage interview questions for this subject.</p>

        {/* Bulk add form */}
        <form
          onSubmit={handleBulkAdd}
          className="bg-white border border-gray-200 rounded-2xl p-6 mb-10 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <h2 className="font-semibold text-navy">Bulk Add Questions</h2>
          </div>
          <p className="text-xs text-gray-400 mb-3 ml-7">
            Separate each question with a <strong>blank line</strong>. A question can span multiple lines.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"What is polymorphism in Java?\n\nExplain the difference between == and .equals()\n\nDescribe the SOLID principles and\nwhy they matter in OOP design."}
            rows={8}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 mb-4 font-mono resize-y"
          />

          <div className="flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="bulk-difficulty" className="text-sm text-gray-600 font-medium">
                Difficulty:
              </label>
              <select
                id="bulk-difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-navy hover:bg-navy-dark text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Questions"}
            </button>
          </div>
        </form>

        {/* Questions list */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy">
            Existing Questions {!loading && <span className="text-gray-400 font-normal">({questions.length})</span>}
          </h2>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : questions.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
            <p className="text-gray-400">No questions added yet. Use the form above to add some.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-navy/20 hover:shadow-sm transition"
              >
                {editingId === q.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-navy focus:ring-4 focus:ring-navy/10"
                    />
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <select
                          value={editDifficulty}
                          onChange={(e) => setEditDifficulty(e.target.value)}
                          className="border border-gray-300 rounded-lg text-xs px-2.5 py-1.5 outline-none focus:border-navy capitalize"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <label className="flex items-center gap-1.5 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={editIsIntro}
                            onChange={(e) => setEditIsIntro(e.target.checked)}
                            className="w-3.5 h-3.5"
                          />
                          Use as intro question (always Q1)
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(q.id)}
                          className="text-xs font-semibold bg-navy text-white px-3 py-1.5 rounded-lg hover:bg-navy-dark transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs text-gray-400 font-semibold">Q{idx + 1}</span>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${difficultyStyles[q.difficulty]}`}>
                          {q.difficulty}
                        </span>
                        {q.is_intro_question && (
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-navy-light text-navy border border-navy/20">
                            Intro
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{q.question_text}</p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(q)}
                        title="Edit"
                        className="p-2 text-gray-400 hover:text-navy hover:bg-navy-light rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(q.id)}
                        title="Delete"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom delete confirmation modal (replaces browser confirm popup) */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-navy text-lg mb-2">Delete this question?</h3>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}