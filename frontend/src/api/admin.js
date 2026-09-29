import api from "./axios";

// Subjects
export const getSubjects = () => api.get("/subjects/");
export const createSubject = (data) => api.post("/subjects/", data);
export const updateSubject = (id, data) => api.put(`/subjects/${id}`, data);
export const deleteSubject = (id) => api.delete(`/subjects/${id}`);

// Questions
export const getQuestionsBySubject = (subjectId) => api.get(`/questions/subject/${subjectId}`);
export const createQuestion = (data) => api.post("/questions/", data);
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);