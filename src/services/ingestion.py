import json
import os
import re
from src.models.store import Lecture, Chapter, TranscriptLine, SessionLocal, init_db

def parse_toc_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data

def time_to_seconds(time_str):
    # Support HH:MM:SS or MM:SS
    parts = time_str.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return 0

def parse_transcript_text(file_path):
    """Parse YouTube-style transcript: HH:MM:SS on its own line, text on following lines."""
    lines_data = []
    if not os.path.exists(file_path):
        return lines_data

    with open(file_path, 'r', encoding='utf-8') as f:
        raw_lines = f.read().splitlines()

    timestamp_re = re.compile(r'^(\d{1,2}:\d{2}:\d{2})$')
    current_ts = None
    text_parts = []

    def flush(ts, parts):
        text = ' '.join(parts).strip()
        if text:
            lines_data.append({
                "start_time": float(time_to_seconds(ts)),
                "end_time": float(time_to_seconds(ts) + 5),
                "content": text
            })

    for line in raw_lines:
        m = timestamp_re.match(line.strip())
        if m:
            if current_ts is not None and text_parts:
                flush(current_ts, text_parts)
            current_ts = m.group(1)
            text_parts = []
        elif current_ts is not None:
            stripped = line.strip()
            skip_prefixes = ('===', 'Title:', 'URL:', 'Video ID:', 'Transcript by')
            if stripped and not any(stripped.startswith(p) for p in skip_prefixes):
                text_parts.append(stripped)

    # Flush last entry
    if current_ts and text_parts:
        flush(current_ts, text_parts)

    return lines_data

def ingest_lecture(lecture_id, toc_path, transcript_paths, video_filename=None, youtube_id=None, drive_file_id=None):
    db = SessionLocal()
    init_db()

    # Parse ToC
    toc_data = parse_toc_file(toc_path)

    # Create or update Lecture
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    # Ensure forward slashes for URL compatibility
    video_path = os.path.join("data", video_filename).replace("\\", "/") if video_filename else None

    if not lecture:
        lecture = Lecture(
            id=lecture_id,
            title=toc_data.get("lecture_title", lecture_id),
            video_url=video_path,
            youtube_id=youtube_id,
            drive_file_id=drive_file_id
        )
        db.add(lecture)
    else:
        lecture.title = toc_data.get("lecture_title", lecture_id)
        lecture.video_url = video_path
        if youtube_id:
            lecture.youtube_id = youtube_id
        if drive_file_id:
            lecture.drive_file_id = drive_file_id

    # Clear existing chapters/lines for re-ingestion
    db.query(Chapter).filter(Chapter.lecture_id == lecture_id).delete()
    db.query(TranscriptLine).filter(TranscriptLine.lecture_id == lecture_id).delete()

    # Add Chapters — support both old and new JSON key formats
    toc_items = toc_data.get("table_of_contents", toc_data.get("toc", []))
    for i, item in enumerate(toc_items):
        # Support both formats: new (timestamp/topic_title/detailed_summary) and old (start_time/title/summary)
        start_str = item.get("timestamp") or item.get("start_time", "0:0:0")
        start = float(time_to_seconds(start_str))

        if i + 1 < len(toc_items):
            next_str = toc_items[i + 1].get("timestamp") or toc_items[i + 1].get("start_time", "0:0:0")
            end = float(time_to_seconds(next_str))
        else:
            end = start + 600.0

        chapter = Chapter(
            lecture_id=lecture_id,
            title=item.get("title") or item.get("topic_title", ""),
            summary=item.get("summary") or item.get("detailed_summary", ""),
            start_time=start,
            end_time=end
        )
        db.add(chapter)

    # Add Transcript Lines
    for t_path in transcript_paths:
        lines = parse_transcript_text(t_path)
        for l in lines:
            line = TranscriptLine(
                lecture_id=lecture_id,
                start_time=l["start_time"],
                end_time=l["end_time"],
                content=l["content"]
            )
            db.add(line)

    db.commit()
    db.close()

    chapter_count = len(toc_items)
    print(f"Successfully ingested {lecture_id}: {chapter_count} chapters, {len(transcript_paths)} transcript file(s)")
