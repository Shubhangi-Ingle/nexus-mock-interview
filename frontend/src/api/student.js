import api from "./axios";

export const getSubjects = () => api.get("/subjects/");