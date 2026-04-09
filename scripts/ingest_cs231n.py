import os
import glob
from src.services.ingestion import ingest_lecture

def find_file(directory, pattern):
    files = glob.glob(os.path.join(directory, pattern))
    return files[0] if files else None

def extract_youtube_id(transcript_path):
    """Extract YouTube Video ID from transcript file header."""
    if not transcript_path or not os.path.exists(transcript_path):
        return None
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('Video ID:'):
                return line.split(':', 1)[1].strip()
            # Stop after header block
            if line.startswith('==='):
                break
    return None

# Google Drive File IDs for each lecture video
# Get from: https://drive.google.com/file/d/{FILE_ID}/view → copy FILE_ID
DRIVE_FILE_IDS = {
    1: os.getenv("LECTURE_1_DRIVE_ID", ""),
    # Add more: 2: "xxx", 3: "yyy", ...
}

def main():
    base_dir = "data/cs231n"
    toc_dir = os.path.join(base_dir, "ToC_Summary")
    transcript_dir = os.path.join(base_dir, "transcripts")
    video_dir = os.path.join(base_dir, "videos")

    # Loop through lecture numbers 1 to 18
    for n in range(1, 2):
        lecture_id = f"lecture-{n}"
        
        # 1. Find ToC
        toc_path = os.path.join(toc_dir, f"lecture-{n}.json")
        if not os.path.exists(toc_path):
            # Try alternate path
            toc_path = os.path.join(base_dir, "slides", "ToC_Summary", f"lecture-{n}.json")
            if not os.path.exists(toc_path):
                print(f"Skipping {lecture_id}: ToC not found")
                continue
                
        # 2. Find Transcript
        # Pattern: ...Lecture_{n}_transcript.txt or ...Lecture_{n}_...
        transcript_pattern = f"*Lecture_{n}_*.txt"
        transcript_path = find_file(transcript_dir, transcript_pattern)
        if not transcript_path:
            # Try without underscore
            transcript_pattern = f"*Lecture {n}*.txt"
            transcript_path = find_file(transcript_dir, transcript_pattern)
            
        if not transcript_path:
            print(f"Warning for {lecture_id}: Transcript not found")
            transcript_paths = []
        else:
            transcript_paths = [transcript_path]
            
        # 3. Find Video
        # Pattern: ...Lecture {n}：... or ...Lecture {n}...
        video_pattern = f"*Lecture {n}*.mp4"
        video_path = find_file(video_dir, video_pattern)
        
        if not video_path:
            # Try with colon (some have Lec X: ...)
            video_pattern = f"*Lecture {n}：*.mp4"
            video_path = find_file(video_dir, video_pattern)

        if not video_path:
            print(f"Warning for {lecture_id}: Video not found")
            video_rel_path = None
        else:
            # Convert to path relative to 'data' directory
            # e.g. data/cs231n/videos/X.mp4 -> cs231n/videos/X.mp4
            # Then UI uses /data/cs231n/videos/X.mp4
            # ingest_lecture will prepend "data" to video_filename
            video_rel_path = os.path.relpath(video_path, "data")
            video_rel_path = video_rel_path.replace("\\", "/")  # Ensure forward slashes for URL

        print(f"Ingesting {lecture_id}...")
        print(f"  ToC: {toc_path}")
        print(f"  Transcript: {transcript_path}")
        print(f"  Video: {video_path}")
        
        youtube_id = extract_youtube_id(transcript_path)
        drive_file_id = DRIVE_FILE_IDS.get(n, "") or None
        if youtube_id:
            print(f"  YouTube ID: {youtube_id}")
        if drive_file_id:
            print(f"  Drive File ID: {drive_file_id}")

        try:
            ingest_lecture(
                lecture_id=lecture_id,
                toc_path=toc_path,
                transcript_paths=transcript_paths,
                video_filename=video_rel_path,
                youtube_id=youtube_id,
                drive_file_id=drive_file_id
            )
        except Exception as e:
            print(f"FAILED to ingest {lecture_id}: {e}")
            continue

if __name__ == "__main__":
    main()
