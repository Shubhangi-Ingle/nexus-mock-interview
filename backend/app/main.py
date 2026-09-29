from fastapi import FastAPI
from sqlalchemy import text
from app.core.database import engine
from app.routers import auth, subjects, questions, interviews, voice

app = FastAPI(title="Nexus Mock Interview API")
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(questions.router)
app.include_router(interviews.router)
app.include_router(voice.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.on_event("startup")
def check_db_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully")
    except Exception as e:
        print("❌ Database connection failed:", e)