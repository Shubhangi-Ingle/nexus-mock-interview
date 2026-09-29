from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

MODEL = "openai/gpt-oss-120b"

def call_groq(system_prompt: str, user_prompt: str, json_mode: bool = True) -> str:
    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        **kwargs,
    )
    return response.choices[0].message.content