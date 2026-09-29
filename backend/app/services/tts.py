import io
import wave
import os
from piper import PiperVoice, SynthesisConfig

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOICE_PATH = os.path.join(BASE_DIR, "voices", "en_US-lessac-medium.onnx")

_voice = PiperVoice.load(VOICE_PATH)

# length_scale > 1.0 slows speech down; 1.0 is the model's default pace
_syn_config = SynthesisConfig(length_scale=1.25, noise_scale=0.6)


def synthesize_speech(text: str) -> bytes:
    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(_voice.config.sample_rate)

        for audio_chunk in _voice.synthesize(text, syn_config=_syn_config):
            wav_file.writeframes(audio_chunk.audio_int16_bytes)

    buffer.seek(0)
    return buffer.read()