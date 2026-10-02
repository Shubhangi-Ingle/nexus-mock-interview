import json
from typing import Optional
from app.services.groq_client import call_groq

FOLLOW_UP_SYSTEM_PROMPT = """You are an interviewer conducting a live spoken mock interview.
You will be given the interview subject, the question you just asked, and the candidate's answer.
Decide whether ONE short follow-up question is worth asking.

Ask a follow-up only when the answer was vague or incomplete, or mentioned something specific worth digging into.
Do NOT ask one when the answer was already complete, or when the candidate gave no real answer (for example "I don't know" or something off-topic).

If you ask one:
- it must build directly on something the candidate actually said
- it must be a single question, under 25 words, phrased the way a person would say it out loud
- do not repeat the original question, and do not give hints, praise, or feedback

Respond ONLY with valid JSON in this exact format, no other text:
{"follow_up": "<your question>"} or {"follow_up": null}
"""

MIN_ANSWER_WORDS = 4


def generate_follow_up(subject_name: str, question: str, answer: str) -> Optional[str]:
    """Returns one follow-up question, or None if no follow-up is needed (or anything fails)."""
    if not answer or len(answer.split()) < MIN_ANSWER_WORDS:
        return None

    user_prompt = (
        f"Subject: {subject_name}\n\n"
        f"Question you asked: {question}\n\n"
        f"Candidate's answer: {answer}"
    )

    try:
        raw = call_groq(FOLLOW_UP_SYSTEM_PROMPT, user_prompt, json_mode=True)
        result = json.loads(raw)
        follow_up = result.get("follow_up")
        if isinstance(follow_up, str) and follow_up.strip():
            return follow_up.strip()
    except Exception:
        pass
    return None