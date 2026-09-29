import json
from app.services.groq_client import call_groq

QUESTION_GEN_SYSTEM_PROMPT = """You are an expert technical interviewer preparing questions for a candidate based on their resume.
Read the resume content and generate relevant, specific interview questions about their listed skills, projects, and experience.
Mix in a couple of general behavioral questions if appropriate.
Respond ONLY with valid JSON in this exact format, no other text:
{"questions": ["question 1", "question 2", ...]}
"""

def generate_questions_from_resume(resume_text: str, count: int) -> list:
    user_prompt = f"Generate exactly {count} interview questions based on this resume:\n\n{resume_text}"

    try:
        raw = call_groq(QUESTION_GEN_SYSTEM_PROMPT, user_prompt, json_mode=True)
        result = json.loads(raw)
        questions = result.get("questions", [])
        questions = [q.strip() for q in questions if q and q.strip()]

        if len(questions) < count:
            # Pad with a generic fallback if the model returned fewer than asked
            while len(questions) < count:
                questions.append("Tell me about a challenging project you've worked on.")
        return questions[:count]
    except Exception:
        # Fallback: generic questions if Groq call fails entirely
        return [
            "Tell me about yourself and your professional background.",
            "Walk me through a project from your resume you're most proud of.",
            "What are your key technical skills and how have you applied them?",
        ][:count]