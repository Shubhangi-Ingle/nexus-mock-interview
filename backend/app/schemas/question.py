from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from app.models.question import DifficultyEnum

class QuestionCreate(BaseModel):
    subject_id: UUID
    question_text: str
    difficulty: DifficultyEnum = DifficultyEnum.medium
    is_intro_question: bool = False

class QuestionUpdate(BaseModel):
    question_text: str | None = None
    difficulty: DifficultyEnum | None = None
    is_intro_question: bool | None = None

class QuestionOut(BaseModel):
    id: UUID
    subject_id: UUID
    question_text: str
    difficulty: DifficultyEnum
    is_intro_question: bool
    created_at: datetime

    class Config:
        from_attributes = True