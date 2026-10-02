from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import datetime

class InterviewStart(BaseModel):
    subject_id: UUID
    duration_minutes: int  # 5, 10, or 15

class QuestionForInterview(BaseModel):
    question_text: str

class InterviewStartResponse(BaseModel):
    session_id: UUID
    subject_name: str
    duration_minutes: int
    questions: List[QuestionForInterview]  # served upfront, frontend paces them one at a time

class AnswerSubmit(BaseModel):
    question_text: str
    answer_text: str

class FollowUpRequest(BaseModel):
    question_text: str
    answer_text: str

class FollowUpOut(BaseModel):
    follow_up: Optional[str] = None

class AnswerOut(BaseModel):
    id: UUID
    question_text: str
    answer_text: Optional[str]
    score: Optional[float]
    feedback: Optional[str]

    class Config:
        from_attributes = True

class SessionOut(BaseModel):
    id: UUID
    subject_id: UUID
    duration_minutes: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True

class SessionHistoryOut(BaseModel):
    id: UUID
    subject_id: UUID
    subject_name: str
    duration_minutes: int
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    overall_score: Optional[float]

    class Config:
        from_attributes = True