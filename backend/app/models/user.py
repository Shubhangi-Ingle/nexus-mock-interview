import uuid
from sqlalchemy import Column, String, Enum, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    student = "student"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.student, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())