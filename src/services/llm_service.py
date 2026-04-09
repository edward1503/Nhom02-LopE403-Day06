import os
import base64
import json
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

def get_context_and_stream_gemini(lecture_id, current_timestamp, user_question, image_base64=None, user_id=None):
    import time
    request_start = time.time()
    db = SessionLocal()
    
    # 1. Get ToC
    chapters = db.query(Chapter).filter(Chapter.lecture_id == lecture_id).all()
    toc_context = "TABLE OF CONTENTS:\n"
    for chap in chapters:
        toc_context += f"- [{chap.start_time:.0f}s - {chap.end_time:.0f}s] {chap.title}: {chap.summary}\n"
        
    # 2. Get Transcript Window (+/- 5 mins = 600s total)
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

    user_prompt = f"Bài học:\n{toc_context}\n\nHiện tại (giây {current_timestamp}):\n{transcript_context}\n\nCâu hỏi: \"{user_question}\""

    # 4. Prepare Content
    content_list = [user_prompt]
    if image_base64:
        try:
            image_data = base64.b64decode(image_base64)
            content_list.append(types.Part.from_bytes(data=image_data, mime_type="image/jpeg"))
        except Exception:
            pass  # Skip image if decode fails

    # 5. Stream from Gemini (with retry for 503 UNAVAILABLE)
    import time
    client = genai.Client(api_key=GEMINI_API_KEY)
    full_answer = ""
    MAX_RETRIES = 3
    
    try:
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
                break  # Success — exit retry loop
            except Exception as retry_err:
                if "503" in str(retry_err) and attempt < MAX_RETRIES - 1:
                    wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                    qa_logger.warning(f"Gemini 503, retrying in {wait}s (attempt {attempt+1}/{MAX_RETRIES})...")
                    time.sleep(wait)
                else:
                    raise  # Re-raise if not 503 or last attempt

        if stream is None:
            raise RuntimeError("Failed to get stream from Gemini after retries")
        
        for chunk in stream:
            # Safely extract text — chunk.text can raise on empty parts
            try:
                text = chunk.text or ""
            except (ValueError, AttributeError, IndexError):
                # Some chunks have candidates but empty parts (metadata-only)
                text = ""
            
            if not text and hasattr(chunk, 'candidates') and chunk.candidates:
                # Fallback: manually extract text from parts
                for part in (chunk.candidates[0].content.parts or []):
                    if hasattr(part, 'text') and part.text:
                        text += part.text
            
            if text:
                full_answer += text
                yield json.dumps({"a": text}) + "\n"

        # 6. Save to DB with latency
        latency_ms = int((time.time() - request_start) * 1000)
        history = QAHistory(
            user_id=user_id,
            lecture_id=lecture_id,
            question=user_question,
            answer=full_answer,
            thoughts="",
            current_timestamp=current_timestamp,
            image_base64=image_base64[:500] if image_base64 else None,
            latency_ms=latency_ms
        )
        db.add(history)
        db.commit()
        db.refresh(history)

        # Send history_id so frontend can call /signal later
        yield json.dumps({"history_id": history.id, "latency_ms": latency_ms}) + "\n"

        # 7. File Log
        qa_logger.info(json.dumps({
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "lecture": lecture_id,
            "at": f"{current_timestamp:.1f}s",
            "q": user_question,
            "a": full_answer
        }, ensure_ascii=False))

    except Exception as e:
        import traceback
        error_detail = f"{type(e).__name__}: {e}"
        qa_logger.error(f"Error: {error_detail}\n{traceback.format_exc()}")
        yield json.dumps({"e": error_detail}) + "\n"
    finally:
        db.close()
