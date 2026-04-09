import os
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from src.models.store import get_db, init_db, Lecture, Chapter, QAHistory, UserSession, SessionLocal
from src.services.llm_service import get_context_and_stream_gemini


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    init_db()
    yield

app = FastAPI(title="Lecture Q&A Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount data to serve videos
app.mount("/data", StaticFiles(directory="data"), name="data")


# ── Session Tracking Middleware ──────────────────────────────────
@app.middleware("http")
async def track_session(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/") and "admin" not in request.url.path:
        try:
            db = SessionLocal()
            try:
                # Single anonymous user (user_id=0) for local mode
                session = db.query(UserSession).filter(UserSession.user_id == 0).first()
                lecture_id = None
                parts = request.url.path.split("/")
                if "lectures" in parts:
                    idx = parts.index("lectures")
                    if idx + 1 < len(parts) and parts[idx + 1] not in ("ask", "signal", "suggest", "toc"):
                        lecture_id = parts[idx + 1]
                
                now = datetime.now(timezone.utc)
                if session:
                    session.last_active = now
                    if lecture_id:
                        session.lecture_id = lecture_id
                else:
                    session = UserSession(user_id=0, last_active=now, lecture_id=lecture_id)
                    db.add(session)
                db.commit()
            finally:
                db.close()
        except Exception:
            pass
    return response


# ── Lecture API ──────────────────────────────────────────────────
class AskRequest(BaseModel):
    lecture_id: str
    current_timestamp: float
    question: str
    image_base64: Optional[str] = None

@app.get("/api/lectures")
def list_lectures(db: Session = Depends(get_db)):
    lectures = db.query(Lecture).all()
    return [
        {"id": lec.id, "title": lec.title, "video_url": lec.video_url}
        for lec in lectures
    ]

@app.get("/api/lectures/{lecture_id}/toc")
def get_toc(lecture_id: str, db: Session = Depends(get_db)):
    chapters = db.query(Chapter).filter(
        Chapter.lecture_id == lecture_id
    ).order_by(Chapter.start_time).all()
    if not chapters:
        raise HTTPException(status_code=404, detail="ToC not found")
    return chapters

@app.post("/api/lectures/ask")
def ask_question(req: AskRequest, db: Session = Depends(get_db)):
    lecture = db.query(Lecture).filter(Lecture.id == req.lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")
    generator = get_context_and_stream_gemini(
        req.lecture_id,
        req.current_timestamp,
        req.question,
        image_base64=req.image_base64,
        user_id=0  # anonymous local user
    )
    return StreamingResponse(generator, media_type="text/event-stream")

# ── Learning Signal API (F1: Đã hiểu / Báo sai) ────────────────
class SignalRequest(BaseModel):
    history_id: int
    action: str  # "understood" | "reported"
    correction_text: Optional[str] = None

@app.post("/api/lectures/signal")
def submit_signal(req: SignalRequest, db: Session = Depends(get_db)):
    """
    Sinh viên nhấn 'Đã hiểu' hoặc 'Báo sai' → ghi Learning Signal.
    Spec-final.md §3: Tỷ lệ Đã hiểu ≥ 75%, Hallucination ≤ 5%.
    """
    history = db.query(QAHistory).filter(QAHistory.id == req.history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History record not found")
    if req.action not in ("understood", "reported"):
        raise HTTPException(status_code=400, detail="action must be 'understood' or 'reported'")

    history.status = req.action
    if req.action == "reported" and req.correction_text:
        history.correction_text = req.correction_text
    db.commit()
    return {"ok": True, "status": history.status}


# ── Proactive Suggestion API (F2: ToC-based) ─────────────────────
@app.get("/api/lectures/{lecture_id}/suggest")
def get_suggestion(lecture_id: str, timestamp: float = 0, db: Session = Depends(get_db)):
    """
    Khi video pause ≥ 3s, frontend gọi endpoint này.
    Tìm chapter chứa timestamp hiện tại, trả về khái niệm + summary.
    """
    chapter = db.query(Chapter).filter(
        Chapter.lecture_id == lecture_id,
        Chapter.start_time <= timestamp,
        Chapter.end_time >= timestamp
    ).first()
    if not chapter:
        chapter = db.query(Chapter).filter(
            Chapter.lecture_id == lecture_id,
            Chapter.start_time <= timestamp
        ).order_by(Chapter.start_time.desc()).first()
    if not chapter:
        return None
    return {
        "concept": chapter.title,
        "summary": chapter.summary,
        "chapter_title": chapter.title,
        "start_time": chapter.start_time,
        "end_time": chapter.end_time
    }


# ── Admin Dashboard API ──────────────────────────────────────────
@app.get("/api/admin/metrics")
def get_admin_metrics(db: Session = Depends(get_db)):
    """Dashboard metrics following spec-final.md §3 Eval Metrics + Threshold."""
    now = datetime.now(timezone.utc)
    total_queries = db.query(func.count(QAHistory.id)).scalar() or 0

    # Eval metrics
    total_with_signal = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status.in_(["understood", "reported"])
    ).scalar() or 0
    understood_count = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status == "understood"
    ).scalar() or 0
    reported_count = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status == "reported"
    ).scalar() or 0

    understood_rate = round(understood_count / total_with_signal * 100, 1) if total_with_signal > 0 else 0
    hallucination_rate = round(reported_count / total_with_signal * 100, 1) if total_with_signal > 0 else 0

    # Latency P95
    latencies = db.query(QAHistory.latency_ms).filter(
        QAHistory.latency_ms.isnot(None)
    ).order_by(QAHistory.latency_ms).all()
    latency_values = [l[0] for l in latencies]
    if latency_values:
        p95_idx = int(len(latency_values) * 0.95)
        latency_p95_ms = latency_values[min(p95_idx, len(latency_values) - 1)]
    else:
        latency_p95_ms = 0

    # Online sessions
    cutoff = now - timedelta(minutes=5)
    online_count = db.query(func.count(UserSession.id)).filter(
        UserSession.last_active >= cutoff
    ).scalar() or 0

    # Recent corrections
    corrections = db.query(QAHistory).filter(
        QAHistory.status == "reported"
    ).order_by(QAHistory.created_at.desc()).limit(20).all()
    corrections_list = [{
        "id": h.id,
        "question": h.question,
        "wrong_answer": (h.answer or "")[:300],
        "correction": h.correction_text,
        "lecture_id": h.lecture_id,
        "created_at": h.created_at.isoformat() if h.created_at else None
    } for h in corrections]

    # Daily stats (last 7 days)
    seven_days_ago = now - timedelta(days=7)
    daily_rows = db.query(
        cast(QAHistory.created_at, Date).label("date"),
        func.count(QAHistory.id).label("queries"),
    ).filter(
        QAHistory.created_at >= seven_days_ago
    ).group_by(cast(QAHistory.created_at, Date)).order_by(
        cast(QAHistory.created_at, Date)
    ).all()
    daily_stats = [{"date": str(r.date), "queries": r.queries} for r in daily_rows]

    return {
        "total_queries": total_queries,
        "online_sessions": online_count,
        "understood_rate": understood_rate,
        "hallucination_rate": hallucination_rate,
        "latency_p95_ms": latency_p95_ms,
        "thresholds": {
            "understood_target": 75, "understood_red": 50,
            "hallucination_target": 5, "hallucination_red": 15,
            "latency_target_ms": 2000, "latency_red_ms": 4000,
        },
        "recent_corrections": corrections_list,
        "daily_stats": daily_stats,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
