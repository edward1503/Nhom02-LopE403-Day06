# 🎓 AI Tutor — Hướng dẫn chạy dự án

Nền tảng học tập đa phương thức (Video + Transcript + ToC) với AI giải đáp thắc mắc theo ngữ cảnh bài giảng theo thời gian thực.

---

## Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|---|---|
| Python | 3.11+ |
| Package manager | [`uv`](https://docs.astral.sh/uv/) |
| API Key | Google Gemini API key (miễn phí tại [aistudio.google.com](https://aistudio.google.com/apikey)) |

---

## Cài đặt nhanh

### Bước 1 — Clone & cài thư viện

```bash
git clone <repo-url>
cd Day06-AI-Product-Hackathon

uv venv .venv
source .venv/bin/activate      # Linux / macOS
# hoặc: .venv\Scripts\activate  # Windows CMD
# hoặc: .venv\Scripts\Activate.ps1  # Windows PowerShell

uv sync
```

### Bước 2 — Tạo file `.env`

Tạo file `.env` ở thư mục gốc:

```env
GEMINI_API_KEY=AIza...your_key_here...
DEFAULT_MODEL=gemini-2.0-flash
```

> Lấy API key miễn phí tại: https://aistudio.google.com/apikey  
> `DEFAULT_MODEL` có thể để mặc định là `gemini-2.0-flash`.

### Bước 3 — Chuẩn bị dữ liệu bài giảng

Tạo cấu trúc thư mục `data/`:

```bash
mkdir -p data/cs231n/videos data/cs231n/transcripts data/cs231n/ToC_Summary
```

Sau đó chép file vào đúng thư mục:

| Loại file | Đặt vào |
|---|---|
| Video bài giảng (`.mp4`) | `data/cs231n/videos/` |
| Transcript (`.txt`) | `data/cs231n/transcripts/` |
| ToC Summary (`.json`) | `data/cs231n/ToC_Summary/` |

**Định dạng transcript** — mỗi dòng theo cú pháp:
```
[HH:MM:SS] Nội dung lời giảng ở đây
```

**Định dạng ToC JSON** — ví dụ:
```json
{
  "lecture_id": "cs231n_lecture1",
  "title": "Introduction to CNNs",
  "table_of_contents": [
    { "title": "Motivation", "start_time": "00:00:00", "summary": "..." },
    { "title": "History of Vision", "start_time": "00:05:30", "summary": "..." }
  ]
}
```

### Bước 4 — Nạp dữ liệu vào database

```bash
PYTHONPATH=. uv run python scripts/ingest_cs231n.py
```

Lệnh này scan toàn bộ `data/cs231n/` và ghi vào `app.db` (SQLite, tự động tạo).

### Bước 5 — Khởi chạy server

```bash
PYTHONPATH=. uv run python src/api/app.py
```

Truy cập tại:
- **Giao diện chính:** http://localhost:8000
- **Admin Dashboard:** http://localhost:8000/admin
- **Streamlit Lab (optional):** chạy riêng — xem phần cuối

---

## Khởi chạy với Docker (khuyên dùng cho demo)

```bash
# 1. Tạo .env (xem Bước 2 ở trên)
# 2. Đặt data vào thư mục data/

docker compose up -d
```

| URL | Mô tả |
|---|---|
| http://localhost:8000 | Giao diện chính |
| http://localhost:8000/admin | Admin dashboard |
| http://localhost:8501 | Streamlit lab UI |

---

## Các trang trong ứng dụng

### `/` — Giao diện học tập chính

Gồm 3 luồng chính đã implement:

**F1 — Hỏi & nhận giải thích theo ngữ cảnh**
1. Chọn bài giảng từ dropdown
2. Xem video — timestamp tự đồng bộ theo video đang chạy
3. Gõ câu hỏi vào ô chat → nhấn **Enter** hoặc **Hỏi Gia sư**
4. AI stream câu trả lời, hiển thị:
   - 📍 Badge nguồn (chapter / timestamp)
   - ⚠️ Cảnh báo vàng nếu AI không tìm thấy trong tài liệu (confidence thấp)
   - ✅ **Đã hiểu** — ghi nhận learning signal
   - ❌ **Báo sai** → nhập câu đúng → gửi correction log

**F2 — Gợi ý chủ động**
- Video **pause > 3 giây** → chip gợi ý hiện ra góc phải màn hình
- Nhấn **Có** → AI tự giải thích chapter đang xem
- Nhấn **✕** → bỏ qua (sau 3 lần bỏ qua, chip tắt trong session)

**F3 — Hội thoại tiếp nối**
- Sau **3+ câu hỏi chưa "Đã hiểu"** trong cùng vùng thời gian → gợi ý xem lại video
- Click link timestamp → video tự seek và play

### `/admin` — Admin Dashboard

Hiển thị 3 metric theo threshold từ spec:

| Metric | Mục tiêu | Ngưỡng đỏ |
|---|---|---|
| Tỷ lệ Đã hiểu | ≥ 75% | < 50% |
| Tỷ lệ Báo sai | ≤ 5% | > 15% |
| Latency P95 | ≤ 2.0s | > 4.0s |

Kèm bảng **Correction Log** — toàn bộ câu hỏi học sinh báo sai + nội dung sửa đúng.

---

## Cấu trúc thư mục

```
Day06-AI-Product-Hackathon/
├── src/
│   ├── api/
│   │   ├── app.py            # FastAPI — tất cả endpoints
│   │   ├── auth.py           # JWT authentication
│   │   └── static/
│   │       ├── index.html    # Giao diện học tập chính (F1/F2/F3)
│   │       ├── admin.html    # Admin dashboard
│   │       └── login.html    # Trang đăng nhập (optional)
│   ├── services/
│   │   ├── llm_service.py    # RAG context + Gemini streaming
│   │   └── ingestion.py      # Parse ToC JSON + transcript
│   ├── models/
│   │   └── store.py          # SQLAlchemy models (SQLite / PostgreSQL)
│   ├── ui/
│   │   └── app.py            # Streamlit lab UI (alternative)
│   └── config.py             # Load biến môi trường
├── scripts/
│   └── ingest_cs231n.py      # Script nạp dữ liệu
├── data/                     # Gitignored — đặt video/transcript/ToC ở đây
├── logs/
│   └── qa_history.log        # Log JSON mọi Q&A
├── app.db                    # SQLite database (tự tạo)
├── .env                      # API keys (không commit)
├── requirements.txt
└── how-to-run.md
```

---

## API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/lectures` | Danh sách bài giảng |
| `GET` | `/api/lectures/{id}/toc` | Table of Contents |
| `POST` | `/api/lectures/ask` | Hỏi AI (streaming SSE) |
| `POST` | `/api/lectures/signal` | Gửi feedback (đã hiểu / báo sai) |
| `GET` | `/api/admin/metrics` | Số liệu dashboard |
| `GET` | `/api/history` | Lịch sử Q&A (cần login) |

**Body của `/api/lectures/ask`:**
```json
{
  "lecture_id": "cs231n_lecture1",
  "current_timestamp": 125.5,
  "question": "Gradient descent là gì?",
  "image_base64": null,
  "is_proactive": false
}
```

**Body của `/api/lectures/signal`:**
```json
{
  "history_id": 42,
  "status": "understood",
  "correction_exact": null
}
```

---

## Chạy Streamlit Lab UI (tùy chọn)

Giao diện debug/lab thay thế:

```bash
PYTHONPATH=. uv run streamlit run src/ui/app.py
```

Truy cập: http://localhost:8501

---

## Xử lý lỗi thường gặp

**`ModuleNotFoundError: No module named 'src'`**
→ Thiếu `PYTHONPATH=.` — thêm vào đầu lệnh.

**`GEMINI_API_KEY not set`**
→ Kiểm tra file `.env` ở thư mục gốc, không phải trong `src/`.

**Video không phát được**
→ Kiểm tra `video_url` trong DB. Nếu dùng đường dẫn local, đảm bảo file đặt trong `data/` và server đang chạy.

**Không có bài giảng nào trong dropdown**
→ Chưa chạy ingestion script. Chạy lại `scripts/ingest_cs231n.py`.

**`app.db` cũ thiếu cột mới**
→ Server tự migrate khi khởi động. Nếu vẫn lỗi, xóa `app.db` và restart (data sẽ mất, cần ingest lại).
