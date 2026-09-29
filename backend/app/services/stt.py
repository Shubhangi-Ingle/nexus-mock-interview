import io
from faster_whisper import WhisperModel

# Load once at import time, same pattern as the Piper voice in tts.py.
# "base" matches what you already validated in test_whisper.py.
_model = WhisperModel("base", device="cpu", compute_type="int8")


def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribe raw audio bytes (webm/wav/whatever the browser sends) to text.
    faster-whisper uses PyAV under the hood, so it can decode compressed
    formats like webm/opus directly — no manual conversion needed.
    """
    audio_stream = io.BytesIO(audio_bytes)
    segments, info = _model.transcribe(audio_stream)
    text = " ".join(segment.text.strip() for segment in segments)
    return text.strip()