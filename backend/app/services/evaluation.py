import json
from app.services.groq_client import call_groq

EVAL_SYSTEM_PROMPT = """You are an expert technical interviewer evaluating a candidate's answer.
Score the answer out of 10 based on correctness, depth, clarity, and communication.
Respond ONLY with valid JSON in this exact format, no other text:
{"score": <number 0-10>, "feedback": "<2-3 sentence constructive feedback>"}
"""

def evaluate_answer(question: str, answer: str) -> dict:
    if not answer or not answer.strip():
        return {"score": 0, "feedback": "No answer was provided for this question."}

    user_prompt = f"Question: {question}\n\nCandidate's Answer: {answer}"

    try:
        raw = call_groq(EVAL_SYSTEM_PROMPT, user_prompt, json_mode=True)
        result = json.loads(raw)
        score = float(result.get("score", 0))
        score = max(0, min(10, score))  # clamp to 0-10
        feedback = result.get("feedback", "").strip()
        return {"score": score, "feedback": feedback}
    except Exception as e:
        # Fail gracefully — don't let one bad Groq response break the whole report
        return {"score": None, "feedback": f"Evaluation failed: could not process this answer."}


REPORT_SYSTEM_PROMPT = """You are an expert interview coach reviewing a candidate's full mock interview performance.
Based on the list of question/answer/score pairs, write an overall assessment.
Respond ONLY with valid JSON in this exact format, no other text:
{"strengths": "<2-3 sentences on what they did well>", "improvements": "<2-3 sentences on what to improve>", "summary": "<1-2 sentence overall summary>"}
"""

def generate_report(qa_pairs: list) -> dict:
    """qa_pairs: list of dicts with question_text, answer_text, score, feedback"""
    lines = []
    for i, qa in enumerate(qa_pairs, 1):
        lines.append(
            f"Q{i}: {qa['question_text']}\n"
            f"Answer: {qa['answer_text'] or '(no answer)'}\n"
            f"Score: {qa['score']}/10\n"
            f"Feedback: {qa['feedback']}\n"
        )
    user_prompt = "\n".join(lines)

    try:
        raw = call_groq(REPORT_SYSTEM_PROMPT, user_prompt, json_mode=True)
        result = json.loads(raw)
        return {
            "strengths": result.get("strengths", "").strip(),
            "improvements": result.get("improvements", "").strip(),
            "summary": result.get("summary", "").strip(),
        }
    except Exception as e:
        return {
            "strengths": "Unable to generate detailed feedback at this time.",
            "improvements": "Unable to generate detailed feedback at this time.",
            "summary": "Report generation encountered an error.",
        }