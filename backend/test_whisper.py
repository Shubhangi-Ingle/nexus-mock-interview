from faster_whisper import WhisperModel

# "base" is a good balance of speed/accuracy for a project like this.
# Options from fastest/least accurate to slowest/most accurate:
# tiny, base, small, medium, large-v3
model = WhisperModel("base", device="cpu", compute_type="int8")

segments, info = model.transcribe("tts_test_output.wav")

print(f"Detected language: {info.language}")
print("Transcription:")
for segment in segments:
    print(segment.text)