import uuid
from sqlalchemy import Column, Text, Enum, TIMESTAMP, ForeignKey, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class DifficultyEnum(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty = Column(Enum(DifficultyEnum), default=DifficultyEnum.medium)
    is_intro_question = Column(Boolean, default=False)   # NEW
    created_at = Column(TIMESTAMP, server_default=func.now())