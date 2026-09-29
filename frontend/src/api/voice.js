import api from "./axios";

export const fetchQuestionAudio = async (text) => {
  const response = await api.post(
    "/voice/tts",
    { text },
    { responseType: "blob" }
  );
  return URL.createObjectURL(response.data);
};

export const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append("audio", audioBlob, "answer.webm");

  const response = await api.post("/voice/stt", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.text;
};