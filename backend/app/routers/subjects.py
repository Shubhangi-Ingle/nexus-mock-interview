from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.deps import require_admin, get_current_user
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectUpdate, SubjectOut

router = APIRouter(prefix="/subjects", tags=["Subjects"])

# Admin: create subject
@router.post("/", response_model=SubjectOut)
def create_subject(payload: SubjectCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    subject = Subject(
        name=payload.name,
        description=payload.description,
        is_resume_based=payload.is_resume_based,
        created_by=admin.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

# Anyone logged in: list subjects (students need this to pick a subject)
@router.get("/", response_model=List[SubjectOut])
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Subject).order_by(Subject.created_at.desc()).all()

# Anyone logged in: get single subject
@router.get("/{subject_id}", response_model=SubjectOut)
def get_subject(subject_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

# Admin: update subject
@router.put("/{subject_id}", response_model=SubjectOut)
def update_subject(subject_id: UUID, payload: SubjectUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if payload.name is not None:
        subject.name = payload.name
    if payload.description is not None:
        subject.description = payload.description

    db.commit()
    db.refresh(subject)
    return subject

# Admin: delete subject
@router.delete("/{subject_id}")
def delete_subject(subject_id: UUID, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"detail": "Subject deleted"}