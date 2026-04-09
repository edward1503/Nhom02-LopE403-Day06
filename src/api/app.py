import os
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from src.models.store import get_db, init_db, Lecture, Chapter, QAHistory, User, UserSession, SessionLocal
from src.services.llm_service import get_context_and_stream_gemini
from src.api.auth import get_current_user

# ── Admin email whitelist (expand as needed) ─────────────────────
ADMIN_EMAILS = os.getenv("ADMIN_EMAILS", "test@test.com,admin@test.com").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    os.makedirs("logs", exist_ok=True)
    init_db()
    yield

app = FastAPI(title="Lecture Q&A Platform API", lifespan=lifespan)

# Mount data to serve videos
app.mount("/data", StaticFiles(directory="data"), name="data")
# LƯU Ý: Static file mount đã được xóa bỏ để nhường chỗ cho Next.js Proxy
# (Nhưng thư mục src/api/static vẫn được giữ lại để tham khảo)


# ── Session Tracking Middleware ──────────────────────────────────
@app.middleware("http")
async def track_user_session(request: Request, call_next):
    response = await call_next(request)
    
    # After response, try to update session for authenticated users
    # We do this non-blocking; errors here should not break the request
    if request.url.path.startswith("/api/") and "admin" not in request.url.path:
        try:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer ") and len(auth_header) > 10:
                # Extract user from token (lightweight check)
                user = get_current_user(request)
                db = SessionLocal()
                try:
                    session = db.query(UserSession).filter(UserSession.user_id == user.id).first()
                    # Detect lecture_id from request path or body
                    lecture_id = None
                    for part in request.url.path.split("/"):
                        if part.startswith("lecture"):
                            # Try next segment
                            parts = request.url.path.split("/")
                            idx = parts.index(part)
                            if idx + 1 < len(parts) and parts[idx + 1] not in ("ask", "signal", "suggest", "toc"):
                                lecture_id = parts[idx + 1]
                            break
                    
                    if session:
                        session.last_active = datetime.utcnow()
                        if lecture_id:
                            session.lecture_id = lecture_id
                    else:
                        session = UserSession(
                            user_id=user.id,
                            last_active=datetime.utcnow(),
                            lecture_id=lecture_id
                        )
                        db.add(session)
                    db.commit()
                finally:
                    db.close()
        except Exception:
            pass  # Session tracking should never break the main request

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
        {
            "id": lec.id,
            "title": lec.title,
            "video_url": lec.video_url,
        }
        for lec in lectures
    ]

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
    user: User = Depends(get_current_user)
):
    try:
        lecture = db.query(Lecture).filter(Lecture.id == req.lecture_id).first()
        if not lecture:
            raise HTTPException(status_code=404, detail="Lecture not found")
            
        generator = get_context_and_stream_gemini(
            req.lecture_id, 
            req.current_timestamp, 
            req.question,
            image_base64=req.image_base64,
            user_id=user.id
        )
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(QAHistory).filter(
        QAHistory.user_id == user.id
    ).order_by(QAHistory.created_at.desc()).limit(50).all()


# ── Learning Signal API ──────────────────────────────────────────
class SignalRequest(BaseModel):
    history_id: int
    action: str  # "understood" | "reported"
    correction_text: Optional[str] = None

@app.post("/api/lectures/signal")
def submit_signal(
    req: SignalRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sinh viên nhấn 'Đã hiểu' hoặc 'Báo sai' → ghi Learning Signal.
    Spec-final.md §3: Tỷ lệ Đã hiểu ≥ 75%, Hallucination ≤ 5%.
    """
    history = db.query(QAHistory).filter(
        QAHistory.id == req.history_id,
        QAHistory.user_id == user.id
    ).first()
    
    if not history:
        raise HTTPException(status_code=404, detail="History record not found")
    
    if req.action not in ("understood", "reported"):
        raise HTTPException(status_code=400, detail="action must be 'understood' or 'reported'")

    history.status = req.action
    if req.action == "reported" and req.correction_text:
        history.correction_text = req.correction_text
    
    db.commit()
    return {"ok": True, "status": history.status}


# ── Proactive Suggestion API (ToC-based) ─────────────────────────
@app.get("/api/lectures/{lecture_id}/suggest")
def get_suggestion(
    lecture_id: str,
    timestamp: float = 0,
    db: Session = Depends(get_db)
):
    """
    Khi video pause ≥ 3s, frontend gọi endpoint này.
    Tìm chapter chứa timestamp hiện tại, trả về khái niệm + summary.
    UX spec F2: Proactive suggestion dùng ToC lookup, không gọi Vision API.
    """
    chapter = db.query(Chapter).filter(
        Chapter.lecture_id == lecture_id,
        Chapter.start_time <= timestamp,
        Chapter.end_time >= timestamp
    ).first()
    
    if not chapter:
        # Fallback: tìm chapter gần nhất
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
def require_admin(user: User = Depends(get_current_user)):
    """Check if user email is in admin whitelist."""
    if user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@app.get("/api/admin/metrics")
def get_admin_metrics(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Dashboard metrics following spec-final.md §3 Eval Metrics + Threshold.
    Returns understood rate, hallucination rate, latency P95, online users, etc.
    """
    # Total counts
    total_queries = db.query(func.count(QAHistory.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    
    # Online users (active within last 5 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    online_sessions = db.query(UserSession).filter(UserSession.last_active >= cutoff).all()
    online_users = len(online_sessions)
    online_user_list = []
    for sess in online_sessions:
        u = db.query(User).filter(User.id == sess.user_id).first()
        if u:
            online_user_list.append({
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "lecture_id": sess.lecture_id,
                "last_active": sess.last_active.isoformat() if sess.last_active else None
            })
    
    # Understood rate: % of answered queries marked "understood"
    total_with_signal = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status.in_(["understood", "reported"])
    ).scalar() or 0
    understood_count = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status == "understood"
    ).scalar() or 0
    understood_rate = round((understood_count / total_with_signal * 100), 1) if total_with_signal > 0 else 0
    
    # Hallucination rate: % of answered queries marked "reported"
    reported_count = db.query(func.count(QAHistory.id)).filter(
        QAHistory.status == "reported"
    ).scalar() or 0
    hallucination_rate = round((reported_count / total_with_signal * 100), 1) if total_with_signal > 0 else 0
    
    # Latency P95 (approximate: get all latencies, sort, pick 95th percentile)
    latencies = db.query(QAHistory.latency_ms).filter(
        QAHistory.latency_ms.isnot(None)
    ).order_by(QAHistory.latency_ms).all()
    latency_values = [l[0] for l in latencies]
    
    if latency_values:
        p95_index = int(len(latency_values) * 0.95)
        latency_p95_ms = latency_values[min(p95_index, len(latency_values) - 1)]
    else:
        latency_p95_ms = 0
    
    # Recent corrections (last 20)
    recent_corrections = db.query(QAHistory).filter(
        QAHistory.status == "reported"
    ).order_by(QAHistory.created_at.desc()).limit(20).all()
    corrections_list = [{
        "id": h.id,
        "question": h.question,
        "wrong_answer": (h.answer or "")[:300],
        "correction": h.correction_text,
        "lecture_id": h.lecture_id,
        "created_at": h.created_at.isoformat() if h.created_at else None
    } for h in recent_corrections]
    
    # Daily stats (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_rows = db.query(
        cast(QAHistory.created_at, Date).label("date"),
        func.count(QAHistory.id).label("queries"),
        func.count(func.nullif(QAHistory.status != "understood", True)).label("understood"),
        func.count(func.nullif(QAHistory.status != "reported", True)).label("reported"),
    ).filter(
        QAHistory.created_at >= seven_days_ago
    ).group_by(
        cast(QAHistory.created_at, Date)
    ).order_by(cast(QAHistory.created_at, Date)).all()
    
    daily_stats = [{
        "date": str(row.date),
        "queries": row.queries,
        "understood": row.understood,
        "reported": row.reported,
    } for row in daily_rows]
    
    return {
        "total_users": total_users,
        "online_users": online_users,
        "online_user_list": online_user_list,
        "total_queries": total_queries,
        "understood_rate": understood_rate,
        "hallucination_rate": hallucination_rate,
        "latency_p95_ms": latency_p95_ms,
        # Thresholds from spec-final.md §3
        "thresholds": {
            "understood_target": 75,
            "understood_red": 50,
            "hallucination_target": 5,
            "hallucination_red": 15,
            "latency_target_ms": 2000,
            "latency_red_ms": 4000,
        },
        "recent_corrections": corrections_list,
        "daily_stats": daily_stats,
    }

@app.get("/api/admin/users")
def get_admin_users(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users with their query count, last active time, and online status."""
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    users = db.query(User).all()
    result = []
    
    for u in users:
        query_count = db.query(func.count(QAHistory.id)).filter(QAHistory.user_id == u.id).scalar() or 0
        session = db.query(UserSession).filter(UserSession.user_id == u.id).first()
        is_online = session and session.last_active and session.last_active >= cutoff
        
        result.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "total_queries": query_count,
            "last_active": session.last_active.isoformat() if session and session.last_active else None,
            "is_online": bool(is_online),
            "current_lecture": session.lecture_id if session else None,
        })
    
    return result


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
