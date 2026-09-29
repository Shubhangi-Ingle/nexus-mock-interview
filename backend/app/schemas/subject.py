from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_resume_based: bool = False

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class SubjectOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    is_resume_based: bool
    created_at: datetime

    class Config:
        from_attributes = True