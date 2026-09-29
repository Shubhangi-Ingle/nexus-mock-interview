from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.models.user import User
from app.services.tts import synthesize_speech
from app.services.stt import transcribe_audio

router = APIRouter(prefix="/voice", tags=["Voice"])


class TTSRequest(BaseModel):
    text: str


@router.post("/tts")
def text_to_speech(payload: TTSRequest, current_user: User = Depends(get_current_user)):
    audio_bytes = synthesize_speech(payload.text)
    return Response(content=audio_bytes, media_type="audio/wav")


@router.post("/stt")
def speech_to_text(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    audio_bytes = audio.file.read()
    text = transcribe_audio(audio_bytes)
    return {"text": text}