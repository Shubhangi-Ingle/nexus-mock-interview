from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ReportOut(BaseModel):
    id: UUID
    session_id: UUID
    overall_score: float
    strengths: str
    improvements: str
    summary: str
    generated_at: datetime

    class Config:
        from_attributes = True