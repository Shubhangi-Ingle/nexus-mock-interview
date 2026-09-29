import uuid
from sqlalchemy import Column, Integer, Enum, TIMESTAMP, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class StatusEnum(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status = Column(Enum(StatusEnum), default=StatusEnum.in_progress)
    resume_text = Column(Text, nullable=True)
    started_at = Column(TIMESTAMP, server_default=func.now())
    ended_at = Column(TIMESTAMP, nullable=True)