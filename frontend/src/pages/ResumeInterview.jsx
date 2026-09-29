import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { startResumeInterview } from "../api/interview";

export default function ResumeInterview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { duration, subject } = location.state || {};

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!subject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-gray-500 mb-4">No interview session found.</p>
          <button onClick={() => navigate("/dashboard")} className="text-navy font-semibold hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      setFile(null);
      return;
    }
    setError("");
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select your resume (PDF) first.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const res = await startResumeInterview(subject.id, duration, file);
      navigate(`/interview/session/${res.data.session_id}`, {
        state: {
          preStarted: true,
          sessionId: res.data.session_id,
          questions: res.data.questions,
          duration: res.data.duration_minutes,
          subject,
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process your resume. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-bold text-navy mb-1 text-center">Resume-Based Interview</h1>
        <p className="text-gray-500 text-center mb-8">
          Upload your resume (PDF) — we'll generate {Math.floor(duration / 5) * 3} personalized questions based on it.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <label
            htmlFor="resume-upload"
            className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-navy/40 hover:bg-navy-light/30 transition"
          >
            <input
              id="resume-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-3xl mb-2">📄</p>
            {file ? (
              <p className="text-sm font-semibold text-navy">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-600">Click to upload your resume</p>
                <p className="text-xs text-gray-400 mt-1">PDF only</p>
              </>
            )}
          </label>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full mt-6 bg-navy hover:bg-navy-dark text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {uploading ? "Analyzing resume & preparing questions..." : "Start Interview →"}
          </button>
        </form>
      </div>
    </div>
  );
}