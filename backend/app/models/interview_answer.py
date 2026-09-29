import uuid
from sqlalchemy import Column, Text, Float, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    answered_at = Column(TIMESTAMP, server_default=func.now())