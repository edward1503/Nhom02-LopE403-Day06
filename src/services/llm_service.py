import os
import base64
import json
import time
import logging
from datetime import datetime
from google import genai
from google.genai import types
from src.config import GEMINI_API_KEY, DEFAULT_MODEL
from src.models.store import SessionLocal, Chapter, TranscriptLine, QAHistory

# Configure File Logging
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)
qa_logger = logging.getLogger("QA_Tutor")
qa_logger.setLevel(logging.INFO)
file_handler = logging.FileHandler(os.path.join(LOG_DIR, "qa_history.log"), encoding='utf-8')
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
qa_logger.addHandler(file_handler)


def _format_time(sec):
    sec = int(sec)
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _calculate_confidence(lines, user_question):
    """Heuristic confidence based on transcript context availability."""
    if not lines:
        return 0.25  # No transcript — general knowledge only

    base = 0.80 if len(lines) >= 5 else 0.65

    # Keyword overlap boost (max +0.15)
    q_words = {w.lower() for w in user_question.split() if len(w) > 3}
    transcript_text = " ".join(l.content.lower() for l in lines)
    overlap = sum(1 for w in q_words if w in transcript_text)
    boost = min(0.15, overlap * 0.04)

    return round(min(0.95, base + boost), 2)


def _get_source_citation(chapters, current_timestamp):
    """Return chapter title at current timestamp."""
    for chap in chapters:
        if chap.start_time <= current_timestamp <= (chap.end_time or float('inf')):
            return f"{chap.title} ({_format_time(chap.start_time)})"
    return f"Video [{_format_time(current_timestamp)}]"


def get_context_and_stream_gemini(
    lecture_id, current_timestamp, user_question,
    image_base64=None, user_id=None, is_proactive=False
):
    db = SessionLocal()
    start_time = time.time()

    try:
        # 1. Get ToC
        chapters = db.query(Chapter).filter(Chapter.lecture_id == lecture_id).all()
        toc_context = "TABLE OF CONTENTS:\n"
        for chap in chapters:
            toc_context += f"- [{chap.start_time:.0f}s - {chap.end_time:.0f}s] {chap.title}: {chap.summary}\n"

        # 2. Get Transcript Window (±5 min)
        start_window = max(0, current_timestamp - 300)
        end_window = current_timestamp + 300

        lines = db.query(TranscriptLine).filter(
            TranscriptLine.lecture_id == lecture_id,
            TranscriptLine.start_time >= start_window,
            TranscriptLine.start_time <= end_window
        ).order_by(TranscriptLine.start_time).all()

        transcript_context = "TRANSCRIPT WINDOW:\n"
        for line in lines:
            transcript_context += f"[{line.start_time:.0f}s] {line.content}\n"

        # 3. System Prompt
        system_instruction = """Bạn là một Gia sư trực tuyến (AI Tutor) thông minh.
Nhiệm vụ: Giải đáp thắc mắc dựa trên bài giảng (Transcript + Hình ảnh).

QUY TẮC:
1. Quan sát hình ảnh đính kèm (nếu có).
2. Câu hỏi trong Window/Hình ảnh: Trả lời chi tiết.
3. Nội dung ĐÃ HỌC: Tóm tắt lại.
4. Nội dung CHƯA HỌC: Nhắc user đợi.
5. LẠC ĐỀ: Nhắc tập trung bài giảng.
"""

        user_prompt = (
            f"Bài học:\n{toc_context}\n\n"
            f"Hiện tại (giây {current_timestamp}):\n{transcript_context}\n\n"
            f"Câu hỏi: \"{user_question}\""
        )

        # 4. Prepare content
        content_list = [user_prompt]
        if image_base64:
            try:
                image_data = base64.b64decode(image_base64)
                content_list.append(types.Part.from_bytes(data=image_data, mime_type="image/jpeg"))
            except Exception:
                pass

        # 5. Stream from Gemini (with retry)
        client = genai.Client(api_key=GEMINI_API_KEY)
        full_answer = ""
        MAX_RETRIES = 3

        gen_config_kwargs = {"system_instruction": system_instruction}
        if "thinking" in DEFAULT_MODEL or "flash-exp" in DEFAULT_MODEL:
            gen_config_kwargs["thinking_config"] = types.ThinkingConfig(include_thoughts=True)

        stream = None
        for attempt in range(MAX_RETRIES):
            try:
                stream = client.models.generate_content_stream(
                    model=DEFAULT_MODEL,
                    config=types.GenerateContentConfig(**gen_config_kwargs),
                    contents=content_list
                )
                break
            except Exception as retry_err:
                if "503" in str(retry_err) and attempt < MAX_RETRIES - 1:
                    wait = 2 ** (attempt + 1)
                    qa_logger.warning(f"Gemini 503, retrying in {wait}s (attempt {attempt+1}/{MAX_RETRIES})...")
                    time.sleep(wait)
                else:
                    raise

        if stream is None:
            raise RuntimeError("Failed to get stream from Gemini after retries")

        for chunk in stream:
            try:
                text = chunk.text or ""
            except (ValueError, AttributeError, IndexError):
                text = ""

            if not text and hasattr(chunk, 'candidates') and chunk.candidates:
                for part in (chunk.candidates[0].content.parts or []):
                    if hasattr(part, 'text') and part.text:
                        text += part.text

            if text:
                full_answer += text
                yield json.dumps({"a": text}) + "\n"

        # 6. Calculate meta
        confidence_score = _calculate_confidence(lines, user_question)
        source_citation = _get_source_citation(chapters, current_timestamp)
        latency_ms = (time.time() - start_time) * 1000

        # 7. Save to DB
        history = QAHistory(
            user_id=user_id,
            lecture_id=lecture_id,
            question=user_question,
            answer=full_answer,
            thoughts="",
            current_timestamp=current_timestamp,
            image_base64=image_base64[:500] if image_base64 else None,
            status="pending",
            confidence_score=confidence_score,
            latency_ms=latency_ms,
            is_proactive=is_proactive,
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        # 8. Yield meta + id (frontend uses these for feedback UI)
        yield json.dumps({
            "meta": {
                "confidence_score": confidence_score,
                "source_citation": source_citation,
                "history_id": history.id,
            }
        }) + "\n"

        # 9. File log
        qa_logger.info(json.dumps({
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "lecture": lecture_id,
            "at": f"{current_timestamp:.1f}s",
            "latency_ms": round(latency_ms),
            "confidence": confidence_score,
            "q": user_question,
            "a": full_answer,
        }, ensure_ascii=False))

    except Exception as e:
        import traceback
        error_detail = f"{type(e).__name__}: {e}"
        qa_logger.error(f"Error: {error_detail}\n{traceback.format_exc()}")
        yield json.dumps({"e": error_detail}) + "\n"
    finally:
        db.close()
