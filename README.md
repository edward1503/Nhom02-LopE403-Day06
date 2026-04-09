# 🎓 AI Tutor Overlay (VinSchool): Real-time Multi-modal Learning Platform

**Nhóm:** Nhom02-403 | **Track:** VinUni-VinSchool | **Giai đoạn:** Mock Prototype (Hackathon Day 6)

Hệ thống hỗ trợ học tập cá nhân hóa sử dụng AI để giải đáp thắc mắc của học viên trực tiếp dựa trên ngữ cảnh bài giảng đa phương thức (Video Frame + Transcript + ToC).

---

## 📌 1. Tóm tắt dự án (Problem & Solution)
**Vấn đề (Pain point):** Sinh viên học online thường xuyên bị gián đoạn tư duy khi phải chuyển tab sang các công cụ tìm kiếm hoặc AI khác để giải đáp thắc mắc trong bài giảng (slide/video). Việc này khiến luồng học tập (flow) bị đứt gãy.

**Giải pháp (Solution):** **AI Tutor Overlay** là một chatbot được nhúng trực tiếp lên trên giao diện nền tảng học tập online. Hệ thống có khả năng ngầm hiểu các nội dung đang hiển thị trên màn hình (thông qua slide PDF hoặc Video Transcript định dạng đa phương thức) và giải thích các khái niệm ngay tại chỗ trong thời gian siêu nhanh (dưới 2 giây).

## ✨ 2. Các Tính Năng Nổi Bật (User Stories)
1. **Giải thích khái niệm theo ngữ cảnh (Context-aware Explanation):** 
   - Kích hoạt khi sinh viên bôi đen hoặc hỏi một thuật ngữ từ slide/video.
   - Trích xuất ảnh báo cáo trực quan tự động (Video Frame/Slide) tại thời điểm hỏi để mô hình phân tích.
   - Mọi mốc thời gian đều chuẩn hóa dạng `Giờ:Phút:Giây` và đi kèm quy chiếu **Badge tính điểm tín nhiệm (Nguồn tham khảo)** để dễ dàng kiểm chứng.
2. **Gợi ý chủ động khi học (Proactive AI Suggestion):** 
   - Kích hoạt tự động khi sinh viên dừng (pause) video > 3 giây hoặc di chuột (hover) vào thuật ngữ lạ.
   - Một chip nhỏ sẽ gợi ý: *"Bạn muốn hiểu rõ hơn về '[khái niệm]' không?"*. Sinh viên có thể bỏ qua hoặc xem ngay giải thích.
3. **Trải nghiệm Streaming Siêu thực (Real-time Feedback):**
   - Phản hồi tức thì từng chữ, tích hợp hiệu ứng "🧠 Thinking" chân thực của mô hình.
   - Hệ thống tự động làm sạch danh sách ToC để dễ theo dõi và hiển thị công thức toán học/Deep Learning sắc nét qua MathJax/KaTeX.

## 🛠 3. Công nghệ sử dụng
- **AI Model:** Google Gemini 2.0 Flash (API) - Lựa chọn hàng đầu nhờ xử lý đa phương thức (multimodal text+image), tốc độ trả lời siêu tốc (latency ~1-1.5s), cực kỳ phù hợp ở quy mô phần mềm MVP. 
- **Backend & Data Pipeline:** Backend sử dụng Python (FastAPI). Hệ thống tự động xử lý Context Retrieval và có Ingestion Pipeline làm sạch văn bản mẫu định tuyến cho các môn học như CS231n để Agent "hiểu" trọn bộ kiến thức khóa học.
- **Frontend / Prototyping:** Giao diện được khởi tạo từ Lovable kết hợp Javascript thuần Vanilla để xử lý Streaming Data trả về từ Server-Sent Events. Việc tách rời này giúp dễ dàng nhúng mã vào web có sẵn, đồng thời ứng dụng `PDF.js` để đọc slide trực tiếp mà không cần Backend render.

## 📊 4. Product Specs, Failure Modes & ROI
- **Metrics Chính:** Khác AI thông thường, hệ thống ưu tiên **Precision thay vì Recall**. Tỷ lệ "Đã hiểu" mục tiêu `≥ 75%`. Tốc độ phản hồi ưu tiên P95 `≤ 2.0s` nhằm giữ luồng tư duy. Tỷ lệ suy diễn bậy (Hallucination) `≤ 5%`.
- **Top Failure Modes (Trường hợp Lỗi & Khắc phục):** 
  - *Ngữ cảnh rỗng:* Hệ thống hiển thị cảnh báo và khuyên user cẩn trọng vì video chưa có transcript gốc.
  - *Hallucination:* Khóa AI vào context bằng chặt chẽ với logic RAG ngầm của hệ backend.
  - *Gợi ý rác (Proactive Spam):* Giải quyết bằng giới hạn Rate Limit (Tối đa 2 lần chủ động gợi ý / 10 phút) và ngủ đông sau 3 lần user ấn Dismiss.
- **ROI kì vọng:** Vận hành cực rẻ (~ $0.25 cho 50 queries/ngày), giảm đáng kể rủi ro Context Switching. Đặc biệt sở hữu khả năng đóng gói Scale lên toàn hệ thống Edu nội bộ rất lớn.

---

## 🐳 Khởi chạy nhanh với Docker (Khuyên dùng)

Dự án đã được Docker hóa hoàn chỉnh, giúp bạn bỏ qua bước cài đặt môi trường phức tạp.

1.  **Thiết lập môi trường**: Tạo file `.env` và điền `GEMINI_API_KEY`.
2.  **Tải dữ liệu bài giảng**: Tải thư mục `data/` (Video, Transcript, ToC) từ Google Drive của nhóm tại đây: [Link Google Drive của bạn] và giải nén vào thư mục gốc của dự án.
3.  **Khởi chạy**:
    ```bash
    docker compose up -d
    ```
4.  **Truy cập**:
    - **Giao diện chính (HTML/JS)**: `http://localhost:8000`
    - **Giao diện Lab (Streamlit)**: `http://localhost:8501`

---

## 🛠️ Cài đặt & Khởi chạy thủ công

### 1. Thiết lập môi trường
```bash
uv venv .venv
source .venv/bin/activate  # Hoặc activate.fish / activate.ps1
uv sync
```

### 2. Cấu hình .env
```env
GEMINI_API_KEY=AIza...
DEFAULT_MODEL=gemini-3-flash-preview
```

### 3. Tạo cấu trúc thư mục data
Do thư mục `data` đã được cấu hình trong `.gitignore`, máy khác sẽ không có các thư mục này. Bạn cần chạy lệnh sau để tạo sẵn cấu trúc thư mục trống chuẩn bị cho bước Ingestion:

**Sử dụng Bash (Linux/macOS/Git Bash):**
```bash
mkdir -p data/cs224n data/cs231n/slides data/cs231n/ToC_Summary data/cs231n/transcripts data/cs231n/videos
```

**Sử dụng Python (đa nền tảng):**
```bash
python -c "import os; [os.makedirs(d, exist_ok=True) for d in ['data/cs224n', 'data/cs231n/slides', 'data/cs231n/ToC_Summary', 'data/cs231n/transcripts', 'data/cs231n/videos']]"
```

*Lưu ý: Sau khi tạo cấu trúc xong, bạn hãy chép thủ công các file Video, Transcript, và ToC vào đúng thư mục tương ứng.*

### 4. Nạp dữ liệu (Ingestion)
Để nạp dữ liệu bài giảng CS231N vào hệ thống (sau khi đã chép file vào thư mục data):
```bash
PYTHONPATH=. uv run python scripts/ingest_cs231n.py
```

### 5. Khởi chạy Backend
```bash
PYTHONPATH=. uv run python src/api/app.py
```

---

## 📂 Cấu trúc thư mục quan trọng
- `src/`: Mã nguồn chính (API, Models, Services).
- `data/cs231n/`: Chứa Video, Transcript và ToC JSON.
- `prompts/`: Chứa các mẫu prompt tối ưu để trích xuất dữ liệu bài giảng.
- `app.db`: Database SQLite (Tự động khởi tạo khi chạy Docker/API).
- `logs/`: Lịch sử câu hỏi theo phiên dưới dạng cấu trúc JSON.

## 🧪 Tài liệu bổ sung
- Sử dụng prompt trong `prompts/lecture_extraction_prompt.txt` để trích xuất summary bài giảng mới đạt độ chính xác cao nhất đối với các môn học khác.
