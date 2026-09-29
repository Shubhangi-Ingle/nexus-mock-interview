import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from app.services.resume import extract_text_from_pdf
from app.services.question_generation import generate_questions_from_resume

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.subject import Subject
from app.models.question import Question
from app.models.interview_session import InterviewSession, StatusEnum
from app.models.interview_answer import InterviewAnswer
from app.models.report import Report
from app.services.evaluation import evaluate_answer, generate_report
from app.schemas.report import ReportOut
from app.schemas.interview import (
    InterviewStart,
    InterviewStartResponse,
    QuestionForInterview,
    AnswerSubmit,
    AnswerOut,
    SessionOut,
    SessionHistoryOut,
)

router = APIRouter(prefix="/interviews", tags=["Interviews"])

QUESTIONS_PER_5_MIN = 3


def calculate_question_count(duration_minutes: int) -> int:
    # 3 questions per 5 minutes: 5->3, 10->6, 15->9
    return (duration_minutes // 5) * QUESTIONS_PER_5_MIN


@router.post("/start", response_model=InterviewStartResponse)
def start_interview(payload: InterviewStart, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subject.is_resume_based:
        raise HTTPException(status_code=400, detail="Use the resume-based interview endpoint for this subject")

    # Auto-abandon any stale in-progress sessions for this user before starting a new one
    stale_sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id, InterviewSession.status == StatusEnum.in_progress)
        .all()
    )
    for s in stale_sessions:
        s.status = StatusEnum.abandoned
        s.ended_at = datetime.utcnow()
    if stale_sessions:
        db.commit()

    question_count = calculate_question_count(payload.duration_minutes)
    if question_count == 0:
        raise HTTPException(status_code=400, detail="Invalid duration")

    all_questions = db.query(Question).filter(Question.subject_id == subject.id).all()
    if len(all_questions) < question_count:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough questions in this subject. Need {question_count}, have {len(all_questions)}.",
        )

    # Separate intro question(s) from the rest
    intro_questions = [q for q in all_questions if q.is_intro_question]
    other_questions = [q for q in all_questions if not q.is_intro_question]

    selected = []
    if intro_questions:
        intro = random.choice(intro_questions)
        selected.append(intro)
        remaining_needed = question_count - 1
        selected += random.sample(other_questions, min(remaining_needed, len(other_questions)))
    else:
        selected = random.sample(all_questions, question_count)

    session = InterviewSession(
        user_id=current_user.id,
        subject_id=subject.id,
        duration_minutes=payload.duration_minutes,
        status=StatusEnum.in_progress,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return InterviewStartResponse(
        session_id=session.id,
        subject_name=subject.name,
        duration_minutes=payload.duration_minutes,
        questions=[QuestionForInterview(question_text=q.question_text) for q in selected],
    )

@router.post("/resume/start", response_model=InterviewStartResponse)
def start_resume_interview(
    subject_id: UUID = Form(...),
    duration_minutes: int = Form(...),
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if not subject.is_resume_based:
        raise HTTPException(status_code=400, detail="This subject is not resume-based")

    # Auto-abandon stale sessions, same as normal start
    stale_sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id, InterviewSession.status == StatusEnum.in_progress)
        .all()
    )
    for s in stale_sessions:
        s.status = StatusEnum.abandoned
        s.ended_at = datetime.utcnow()
    if stale_sessions:
        db.commit()

    question_count = calculate_question_count(duration_minutes)
    if question_count == 0:
        raise HTTPException(status_code=400, detail="Invalid duration")

    resume_text = extract_text_from_pdf(resume)
    generated_questions = generate_questions_from_resume(resume_text, question_count)

    session = InterviewSession(
        user_id=current_user.id,
        subject_id=subject.id,
        duration_minutes=duration_minutes,
        status=StatusEnum.in_progress,
        resume_text=resume_text,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return InterviewStartResponse(
        session_id=session.id,
        subject_name=subject.name,
        duration_minutes=duration_minutes,
        questions=[QuestionForInterview(question_text=q) for q in generated_questions],
    )

@router.post("/{session_id}/answer", response_model=AnswerOut)
def submit_answer(session_id: UUID, payload: AnswerSubmit, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != StatusEnum.in_progress:
        raise HTTPException(status_code=400, detail="Session is not in progress")

    answer = InterviewAnswer(
        session_id=session.id,
        question_text=payload.question_text,
        answer_text=payload.answer_text,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


@router.post("/{session_id}/complete", response_model=SessionOut)
def complete_interview(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != StatusEnum.in_progress:
        raise HTTPException(status_code=400, detail="Session already completed")

    session.status = StatusEnum.completed
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    # Evaluate each answer
    answers = db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session.id).all()
    qa_pairs = []
    total_score = 0
    scored_count = 0

    for ans in answers:
        result = evaluate_answer(ans.question_text, ans.answer_text)
        ans.score = result["score"]
        ans.feedback = result["feedback"]
        db.add(ans)

        if result["score"] is not None:
            total_score += result["score"]
            scored_count += 1

        qa_pairs.append({
            "question_text": ans.question_text,
            "answer_text": ans.answer_text,
            "score": result["score"],
            "feedback": result["feedback"],
        })

    db.commit()

    # Generate overall report
    overall_score = round(total_score / scored_count, 1) if scored_count > 0 else 0
    report_content = generate_report(qa_pairs)

    report = Report(
        session_id=session.id,
        overall_score=overall_score,
        strengths=report_content["strengths"],
        improvements=report_content["improvements"],
        summary=report_content["summary"],
    )
    db.add(report)
    db.commit()

    return session


@router.post("/{session_id}/abandon", response_model=SessionOut)
def abandon_interview(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    if session.status != StatusEnum.in_progress:
        # Already completed or already abandoned — nothing to do, don't error
        return session

    session.status = StatusEnum.abandoned
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@router.delete("/{session_id}")
def delete_interview(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session.id).delete()
    db.query(Report).filter(Report.session_id == session.id).delete()
    db.delete(session)
    db.commit()
    return {"detail": "Session deleted"}

@router.get("/history/all", response_model=List[SessionHistoryOut])
def get_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.started_at.desc())
        .all()
    )

    result = []
    for session in sessions:
        subject = db.query(Subject).filter(Subject.id == session.subject_id).first()
        report = db.query(Report).filter(Report.session_id == session.id).first()

        result.append(SessionHistoryOut(
            id=session.id,
            subject_id=session.subject_id,
            subject_name=subject.name if subject else "Unknown Subject",
            duration_minutes=session.duration_minutes,
            status=session.status.value,
            started_at=session.started_at,
            ended_at=session.ended_at,
            overall_score=report.overall_score if report else None,
        ))

    return result


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")
    return session


@router.get("/{session_id}/answers", response_model=List[AnswerOut])
def get_session_answers(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    return db.query(InterviewAnswer).filter(InterviewAnswer.session_id == session_id).all()


@router.get("/{session_id}/report", response_model=ReportOut)
def get_report(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your session")

    report = db.query(Report).filter(Report.session_id == session_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report