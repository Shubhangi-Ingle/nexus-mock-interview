import uuid
from sqlalchemy import Column, Float, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("interview_sessions.id"), unique=True, nullable=False)
    overall_score = Column(Float, nullable=False)
    strengths = Column(Text, nullable=True)
    improvements = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    generated_at = Column(TIMESTAMP, server_default=func.now())