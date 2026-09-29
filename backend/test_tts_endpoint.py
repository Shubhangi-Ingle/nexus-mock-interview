import requests

# Replace with a real token — log in via /docs first, or use one you already have
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmZTE0NDE3Yy02Y2E5LTQ2NjMtOTJlZC1lZjVjMDJhZTIwODEiLCJyb2xlIjoic3R1ZGVudCIsImV4cCI6MTc4NTM5NTkzNH0.Da_WioVz3BHPEP0KV8py_YKzeNUBKlnTD7XsuR_9uOg"

response = requests.post(
    "http://127.0.0.1:8000/voice/tts",
    json={"text": "Hello, welcome to your Nexus mock interview."},
    headers={"Authorization": f"Bearer {TOKEN}"},
)

with open("tts_test_output.wav", "wb") as f:
    f.write(response.content)

print(f"Status: {response.status_code}")
print(f"Saved {len(response.content)} bytes to tts_test_output.wav")