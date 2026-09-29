import uuid
from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_resume_based = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())