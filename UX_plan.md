# Phase 5: Hoàn thiện tính năng theo Spec & UX (AI Tutor Overlay)

## Tóm tắt Mục Tiêu
Căn cứ vào `spec-final.md` và `ux.md`, chúng ta sẽ cấu trúc hệ thống để hỗ trợ 3 quy trình cốt lõi và 1 trang quản trị:
1. **F1. Context-aware Explanation (Giải thích theo ngữ cảnh)**: Overlay với đánh giá tin cậy (Confidence), nhãn nguồn (Source badge) và luồng Correction (Đã hiểu / Báo sai).
2. **F2. Proactive Suggestion (Gợi ý chủ động)**: Gợi ý khái niệm khi video pause >3s.
3. **F3. Follow-up Dialogue (Hội thoại tiếp nối)**: Duy trì chuỗi hội thoại, cảnh báo nếu lặp lại >3 lượt.
4. **Admin Dashboard**: Thống kê Eval metrics (Tỷ lệ Đã hiểu, Tỷ lệ Hallucination, Latency P95).

---

## Thay Đổi Backend (FastAPI & SQLite)

### 1. Database Schema (`src/models/store.py`)
Mở rộng bảng `QAHistory` để lưu Learning Signals và Telemetry:
- `status`: String (`pending`, `understood`, `reported`)
- `correction_exact`: Text (Dành cho việc người dùng nhập câu trả lời đúng khi báo sai)
- `latency_ms`: Float (Thời gian từ lúc request đến lúc trả luồng SSE)
- `confidence_score`: Float (Từ 0.0 đến 1.0)
- `is_proactive`: Boolean (Câu hỏi có xuất phát từ Suggestion chip không)

### 2. LLM Service (`src/services/llm_service.py`)
- Sửa đổi Prompt/System Instruction để yêu cầu output trả về dưới dạng JSON có cấu trúc nhằm phân tách rõ ràng. Khung phản hồi: 
  ```json
  {
      "explanation": "Nội dung giải thích...",
      "source_citation": "Slide 7 / Video 01:23",
      "confidence_score": 0.85
  }
  ```
  *(Vì luồng là Streaming (SSE), ta có thể stream text `explanation`, phần `source_citation` và `confidence` có thể trả ở chunk cuối).*
- Logic tính Latency (P95) và lưu log khi kết thúc streaming.

### 3. API Endpoints (`src/api/app.py`)
- `POST /api/lectures/signal`: Nơi Next.js gửi request cập nhật trạng thái `understood` hoặc `reported` (`correction_exact`) cho một `history_id` cụ thể.
- `GET /api/admin/metrics`: Trả về số liệu thống kê tổng hợp:
  - `% Đã hiểu` (mục tiêu ≥75%)
  - `% Mắc lỗi/Hallucination` (mục tiêu ≤5%)
  - `Latency P95` (mục tiêu ≤2.0s)
  - Danh sách recent Correction Logs.

---

## Thay Đổi Frontend (Next.js)

### 1. UI Overlay & Flow (F1 & F3) (`src/app/page.js`)
- Đổi giao diện Chat Box thành dạng Overlay / Sidebar bên cạnh đoạn Video.
- Khi gửi request hỏi AI:
  - Bắt thời gian bắt đầu và kết thúc để log Latency (nếu front-end muốn gửi lên).
  - Component `MessageBubble` sẽ được phân nhánh:
    - Nếu `confidence < 80%`: Hiển thị banner vàng *"AI không tìm thấy nội dung... dựa trên kiến thức chung"*.
    - Nằm dưới câu trả lời AI là các nút hành động: **[✅ Đã hiểu]** và **[❌ Báo sai]**.
    - Nếu nhấn **[❌ Báo sai]**, một inline-form hiện ra *"Câu trả lời đúng là gì?"* để submit lên API `/signal`.
- **Logic F3**: Nếu trong chuỗi có >3 message thuộc một context nhưng người dùng chưa chốt "Đã hiểu", AI tự chèn nút "Bạn muốn xem lại phần video này không?".

### 2. Proactive Suggestion (F2) (`src/app/page.js`)
- Bắt sự kiện video `pause`. Nếu `pause` ≥ 3s:
  - Bắn một request ẩn lấy frame hiện tại gửi cho LLM với prompt *"Trích xuất 1 thuật ngữ khó nhất đang hiển thị, hoặc trả về null"*.
  - Nếu có kết quả, hiển thị Chip nổi ở góc phải: *"💡 Bạn muốn hiểu rõ hơn về [Khái niệm] không?"*.
  - Nếu User bấm *Có*, mở Overlay tự động điền câu hỏi.
  - Nếu User bấm *X*, ghi nhận *Dismiss signal* chặn không gợi ý tiếp trong 10 phút.

### 3. Admin Dashboard (`src/app/admin/page.js`)
- Quản lý truy cập: Chỉ admin mới thấy trang này.
- Giao diện 3 Metrics Cards (Sử dụng biểu tượng màu Xanh/Đỏ tùy theo Threshold).
- Bảng hiển thị `Correction Log` giúp phân tích failure mode.

---

## Câu Hỏi Mở (Vui lòng xác nhận trước khi mình code)
1. Để bắt được `confidence_score` và `source_citation` ổn định nhất, ta nên sửa `gemini-2.0-flash` response format dạng JSON Object không?
2. Trong phần Proactive Suggestion, thay vì gọi AI liên tục (tốn chi phí) mỗi khi pause, bạn có muốn mình dùng thuật toán lấy random thuật ngữ trong `ToC Document` ở timestamp gần đó (Rẻ & Nhanh hơn) không? Hay phải dùng Vision Image Capture?

> [!IMPORTANT]
> Việc xây dựng luồng F2 (Proactive Suggestion liên tục bắt Pause) có thể khiến giao diện React hơi phức tạp khi xử lý event listener. Nếu OK, mình sẽ thực hiện F1 và Admin Dashboard trước, sau đó bổ sung F2 sau cùng dựa trên timer pause video.
