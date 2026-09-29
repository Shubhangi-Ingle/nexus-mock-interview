import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DURATIONS = [5, 10, 15];

export default function DurationModal({ subject, onClose }) {
  const [selected, setSelected] = useState(10);
  const navigate = useNavigate();

  const handleStart = () => {
    if (subject.is_resume_based) {
      navigate(`/interview/resume/${subject.id}`, { state: { duration: selected, subject } });
    } else {
      navigate(`/interview/${subject.id}`, { state: { duration: selected, subject } });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-navy text-lg">{subject.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          {subject.is_resume_based
            ? "Choose how long your resume-based interview should run."
            : "Choose how long you want this mock interview to run."}
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
        <div className="flex gap-3 mb-6">
          {DURATIONS.map((min) => (
            <button
              key={min}
              onClick={() => setSelected(min)}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold border-2 transition ${
                selected === min
                  ? "border-navy bg-navy-light text-navy"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {min} min
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-navy text-white hover:bg-navy-dark transition"
          >
            {subject.is_resume_based ? "Upload Resume →" : "Start Interview →"}
          </button>
        </div>
      </div>
    </div>
  );
}