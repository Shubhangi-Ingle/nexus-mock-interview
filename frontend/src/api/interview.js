import api from "./axios";

export const startInterview = (subjectId, durationMinutes) =>
  api.post("/interviews/start", { subject_id: subjectId, duration_minutes: durationMinutes });

export const submitAnswer = (sessionId, questionText, answerText) =>
  api.post(`/interviews/${sessionId}/answer`, { question_text: questionText, answer_text: answerText });

export const completeInterview = (sessionId) =>
  api.post(`/interviews/${sessionId}/complete`);

export const getReport = (sessionId) => api.get(`/interviews/${sessionId}/report`);
export const getSessionAnswers = (sessionId) => api.get(`/interviews/${sessionId}/answers`);

export const getHistory = () => api.get("/interviews/history/all");
export const abandonInterview = (sessionId) => api.post(`/interviews/${sessionId}/abandon`);
export const deleteSession = (sessionId) => api.delete(`/interviews/${sessionId}`);

export const startResumeInterview = (subjectId, durationMinutes, file) => {
  const formData = new FormData();
  formData.append("subject_id", subjectId);
  formData.append("duration_minutes", durationMinutes);
  formData.append("resume", file);

  return api.post("/interviews/resume/start", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};