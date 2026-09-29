import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getSubjects, createSubject, updateSubject, deleteSubject } from "../api/admin";

export default function AdminDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isResumeBased, setIsResumeBased] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await getSubjects();
      setSubjects(res.data);
    } catch (err) {
      setError("Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsResumeBased(false);
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }
    try {
      if (editingId) {
        await updateSubject(editingId, { name, description });
      } else {
        await createSubject({ name, description, is_resume_based: isResumeBased });
      }
      resetForm();
      loadSubjects();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong.");
    }
  };

  const handleEdit = (subject) => {
    setEditingId(subject.id);
    setName(subject.name);
    setDescription(subject.description || "");
    setIsResumeBased(subject.is_resume_based);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject? This will also remove its questions.")) return;
    try {
      await deleteSubject(id);
      loadSubjects();
    } catch (err) {
      alert("Failed to delete subject.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-navy">Admin Panel</h1>
            <p className="text-gray-500 mt-1">Manage subjects and interview questions.</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-navy hover:bg-navy-dark text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition"
          >
            + Add Subject
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm"
          >
            <h2 className="font-semibold text-navy mb-4">
              {editingId ? "Edit Subject" : "New Subject"}
            </h2>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Java, Python, SQL"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional short description"
              rows={2}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-navy focus:ring-4 focus:ring-navy/10 mb-4"
            />

            {!editingId && (
              <label className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isResumeBased}
                  onChange={(e) => setIsResumeBased(e.target.checked)}
                  className="w-4 h-4"
                />
                This is the Resume-Based interview subject
              </label>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-navy hover:bg-navy-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {editingId ? "Save Changes" : "Create Subject"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="text-gray-400">No subjects yet. Add one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-navy text-lg">{subject.name}</h3>
                  {subject.is_resume_based && (
                    <span className="text-[10px] bg-orange-light text-brand-orange font-semibold px-2 py-1 rounded-full">
                      Resume Based
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4 min-h-[2.5rem]">
                  {subject.description || "No description"}
                </p>
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => navigate(`/admin/subjects/${subject.id}`)}
                    className="text-sm font-semibold text-navy hover:underline"
                  >
                    Manage Questions →
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(subject)}
                      className="text-xs text-gray-400 hover:text-navy"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id)}
                      className="text-xs text-gray-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}