import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.models.store import get_db, init_db, SessionLocal, Lecture, Chapter, QAHistory, User
from src.services.llm_service import get_context_and_stream_gemini
from src.api.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_user
)


def _migrate_qa_history(db):
    """Add new columns to qa_history if they don't exist (SQLite-safe)."""
    new_columns = [
        ("status",           "VARCHAR DEFAULT 'pending'"),
        ("correction_exact", "TEXT"),
        ("latency_ms",       "REAL"),
        ("confidence_score", "REAL"),
        ("is_proactive",     "INTEGER DEFAULT 0"),
    ]
    for col_name, col_def in new_columns:
        try:
            db.execute(text(f"ALTER TABLE qa_history ADD COLUMN {col_name} {col_def}"))
            db.commit()
        except Exception:
            db.rollback()  # Column already exists — safe to ignore


@asynccontextmanager
async def lifespan(_app: FastAPI):
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    init_db()

    db = SessionLocal()
    try:
        _migrate_qa_history(db)

        # Create default test user for demo
        if not db.query(User).filter(User.email == "test@test.com").first():
            test_user = User(
                email="test@test.com",
                name="Test Demo",
                password_hash=hash_password("test")
            )
            db.add(test_user)
            db.commit()
    finally:
        db.close()

    yield


app = FastAPI(title="Lecture Q&A Platform API", lifespan=lifespan)

app.mount("/data", StaticFiles(directory="data"), name="data")
app.mount("/static", StaticFiles(directory="src/api/static"), name="static")


# ── Pages ────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return FileResponse("src/api/static/index.html")

@app.get("/login")
def login_page():
    return FileResponse("src/api/static/login.html")

@app.get("/admin")
def admin_page():
    return FileResponse("src/api/static/admin.html")


# ── Auth API ─────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
def register(req: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")
    user = User(email=req.email, name=req.name, password_hash=hash_password(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=86400)
    return {"id": user.id, "email": user.email, "name": user.name}

@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không đúng")
    token = create_access_token(user.id, user.email)
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=86400)
    return {"id": user.id, "email": user.email, "name": user.name}

@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True}

@app.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.name}


# ── Lecture API ──────────────────────────────────────────────────
class AskRequest(BaseModel):
    lecture_id: str
    current_timestamp: float
    question: str
    image_base64: Optional[str] = None
    is_proactive: bool = False

@app.get("/api/lectures")
def list_lectures(db: Session = Depends(get_db)):
    lectures = db.query(Lecture).all()
    return [{"id": lec.id, "title": lec.title, "video_url": lec.video_url} for lec in lectures]

@app.get("/api/lectures/{lecture_id}/toc")
def get_toc(lecture_id: str, db: Session = Depends(get_db)):
    chapters = db.query(Chapter).filter(Chapter.lecture_id == lecture_id).order_by(Chapter.start_time).all()
    if not chapters:
        raise HTTPException(status_code=404, detail="ToC not found")
    return chapters

@app.post("/api/lectures/ask")
def ask_question(
    req: AskRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    lecture = db.query(Lecture).filter(Lecture.id == req.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    generator = get_context_and_stream_gemini(
        req.lecture_id,
        req.current_timestamp,
        req.question,
        image_base64=req.image_base64,
        user_id=user.id if user else None,
        is_proactive=req.is_proactive,
    )
    return StreamingResponse(generator, media_type="text/event-stream")


# ── Signal API (F1 feedback) ──────────────────────────────────────
class SignalRequest(BaseModel):
    history_id: int
    status: str  # "understood" or "reported"
    correction_exact: Optional[str] = None

@app.post("/api/lectures/signal")
def submit_signal(req: SignalRequest, db: Session = Depends(get_db)):
    if req.status not in ("understood", "reported"):
        raise HTTPException(status_code=400, detail="status must be 'understood' or 'reported'")
    history = db.query(QAHistory).filter(QAHistory.id == req.history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    history.status = req.status
    if req.correction_exact:
        history.correction_exact = req.correction_exact
    db.commit()
    return {"ok": True}


# ── Admin Metrics API ─────────────────────────────────────────────
@app.get("/api/admin/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    total = db.query(QAHistory).count()
    understood = db.query(QAHistory).filter(QAHistory.status == "understood").count()
    reported = db.query(QAHistory).filter(QAHistory.status == "reported").count()

    pct_understood = round(understood / total * 100, 1) if total > 0 else 0
    pct_hallucination = round(reported / total * 100, 1) if total > 0 else 0

    # Latency P95
    rows = db.query(QAHistory.latency_ms).filter(QAHistory.latency_ms.isnot(None)).all()
    latencies = sorted(r[0] for r in rows)
    latency_p95_s = 0.0
    if latencies:
        idx = min(int(len(latencies) * 0.95), len(latencies) - 1)
        latency_p95_s = round(latencies[idx] / 1000, 2)

    corrections = (
        db.query(QAHistory)
        .filter(QAHistory.status == "reported")
        .order_by(QAHistory.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "total": total,
        "understood": understood,
        "reported": reported,
        "pct_understood": pct_understood,
        "pct_hallucination": pct_hallucination,
        "latency_p95_s": latency_p95_s,
        "corrections": [
            {
                "id": c.id,
                "question": (c.question or "")[:150],
                "answer": (c.answer or "")[:200],
                "correction": c.correction_exact,
                "confidence_score": c.confidence_score,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in corrections
        ],
    }


# ── History API ───────────────────────────────────────────────────
@app.get("/api/history")
def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(QAHistory).filter(
        QAHistory.user_id == user.id
    ).order_by(QAHistory.created_at.desc()).limit(50).all()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
