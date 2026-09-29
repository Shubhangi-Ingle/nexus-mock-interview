from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.deps import require_admin, get_current_user
from app.models.question import Question
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionOut

router = APIRouter(prefix="/questions", tags=["Questions"])


def _clear_other_intro_flags(db: Session, subject_id: UUID, exclude_id: UUID = None):
    """Ensures only one question per subject can be marked as the intro question."""
    query = db.query(Question).filter(
        Question.subject_id == subject_id,
        Question.is_intro_question == True,
    )
    if exclude_id:
        query = query.filter(Question.id != exclude_id)
    query.update({Question.is_intro_question: False})


# Admin: create question
@router.post("/", response_model=QuestionOut)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    question = Question(
        subject_id=payload.subject_id,
        question_text=payload.question_text,
        difficulty=payload.difficulty,
        is_intro_question=payload.is_intro_question,
    )
    db.add(question)
    db.flush()  # assigns question.id without committing yet

    if payload.is_intro_question:
        _clear_other_intro_flags(db, payload.subject_id, exclude_id=question.id)

    db.commit()
    db.refresh(question)
    return question


# Anyone logged in: list questions for a subject
@router.get("/subject/{subject_id}", response_model=List[QuestionOut])
def list_questions_by_subject(subject_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Question).filter(Question.subject_id == subject_id).all()


# Admin: update question
@router.put("/{question_id}", response_model=QuestionOut)
def update_question(question_id: UUID, payload: QuestionUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.question_text is not None:
        question.question_text = payload.question_text
    if payload.difficulty is not None:
        question.difficulty = payload.difficulty
    if payload.is_intro_question is not None:
        question.is_intro_question = payload.is_intro_question
        if payload.is_intro_question:
            _clear_other_intro_flags(db, question.subject_id, exclude_id=question.id)

    db.commit()
    db.refresh(question)
    return question


# Admin: delete question
@router.delete("/{question_id}")
def delete_question(question_id: UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    return {"detail": "Question deleted"}