# Self Reflection & Codebase Summary

**Student Name:** Nguyễn Đôn Đức
**Student ID:** 2A202600145
**Class:** E403

## 1. Tổng hợp toàn bộ codebase (Codebase Architecture Summary)

Dự án AI Tutor này được thiết kế với kiến trúc gọn nhẹ, dễ dàng triển khai (đặc biệt cho quy mô prototype/hackathon trong lúc chịu sức ép thời gian):

- **Backend (FastAPI)**:
  - `src/api/app.py`: Đóng vai trò là entry point chính của API. Cung cấp các endpoint phục vụ Frontend bằng Static files, quản lý Authentication (Register/Login bằng thẻ cookie bảo mật), thao tác Lectures/ToC, và giao tiếp với LLM (hỏi đáp stream context/ảnh). Đồng thời chứa những endpoint thu thập tín hiệu F1 feedback (Understood/Reported) và Admin metrics (để kiểm soát việc vận hành AI, hallucination rate, streaming latency...).
  - `src/api/auth.py`: Xử lý logic vòng đời authentication gồm hash mật khẩu, tạo và xác thực JWT token nhanh gọn.

- **Services**:
  - `src/services/llm_service.py`: Chứa tác vụ giao tiếp trực tiếp với LLM (Google Gemini). Xây dựng một context window động (±5 phút xung quanh vị trí transcript hiện tại của video) và nạp Table of Contents cho Agent "có bức tranh toàn cảnh". Tích hợp logic tính toán *Confidence Score* dựa trên heuristic về lượng thông tin có trong transcript và streaming kết quả realtime. Đảm bảo có lưu log chi tiết QA history vào log file của thư mục `logs/` và Database.
  - `src/services/ingestion.py`: Quản lý các task parse dữ liệu ban đầu như video content, video transcript hay metadata vào trong cơ sở dữ liệu.

- **Models / Database**:
  - `src/models/store.py`: Schema database chuẩn mực với SQLAlchemy, sử dụng SQLite làm nền tảng. Các Entity chính: `User`, `Lecture`, `Chapter`, `TranscriptLine`, `QAHistory`. Cấu trúc vừa đủ để làm nền cho hệ thống AI platform + Log lại mọi tương tác.

- **Frontend Tĩnh (Vanilla)**:
  - Nằm trong `src/api/static/` và được FastAPI serve. Rất tinh gọn với `index.html` (User video screen & Chat UI), `login.html`, `admin.html` (Dashboard). Giao diện dùng thuần HTML/JS/CSS giúp bỏ qua khâu build tool rườm rà, rất hợp lý cho việc tinh chỉnh DOM nhanh phục vụ demo.

- **Extensibility Modules**:
  - Khối `src/agent.py` và `src/tools.py`: Đại diện cho bản draft của kiến trúc multi-tools framework với Anthropic Claude, làm tiền đề nếu sau này mở rộng Tutor agent sang khả năng thực hiện tác vụ (gọi DB, search web). Tuy nhiên trong scope chính của Demo, ta tập trung vào "Low-latency Tutor" nên luồng trả lời tức thì bằng Gemini được ưu tiên ở `llm_service.py`.

---

## 2. Self Reflection 

### 2.1. Role và Đóng góp cụ thể
- **Vai trò**: AI Engineer.
- **Đóng góp**: 
  - Khảo sát và xây dựng flow Backend API cùng FastAPI. Đảm bảo API ghép nối được với Frontend stream dữ liệu tức thì không bị tắc nghẽn (Server-Sent Events).
  - Tối ưu hóa **Prompt Context Mechanism**: Sử dụng cửa sổ thời gian (±5 phút xung quanh timestamp) thay vì "nhồi" toàn bộ transcript cả tiếng vào LLM, giúp vừa tiết kiệm token, tốc độ phản hồi nhanh hơn, vừa giúp AI Tutor "hiểu" bối cảnh hiện tại tốt nhất.
  - Phác thảo Backend Admin Metrics (tính tỉ lệ hallucination dựa trên User report) và Response Latency tracking (P95) để đánh giá tiêu chuẩn kỹ thuật số.

### 2.2. SPEC phần mạnh nhất và yếu nhất? Vì sao?
- **Mạnh nhất**: Đặt tư duy sản phẩm AI lên trên tư duy kỹ thuật thuần túy. Em đã cài cắm được *Confidence Score* và nút Signal Reporting vào Model `QAHistory`. Điều này dẫn đến sự khác biệt giữa "Dự án call API" và một "Sản phẩm AI tạo ra data flywheel (vòng lặp thu thập phản hồi)", đúng tiêu chí cốt lõi của Hackathon (đặt Eval Metrics & ROI metrics chuẩn).
- **Yếu nhất**: Cơ chế tính Heuristic Confidence Score dựa trên tỷ lệ từ vựng (overlapping words) tương đối cứng nhắc. Việc tính toán score sẽ đáng tin cậy hơn nếu dùng một model nhỏ (ví dụ text classifier/embedding) hoặc tự review bằng LLM (Self-Reflection Chain). Ngoài ra, "Proactive Suggestions" chưa thật sự thông minh và mới mang tính demo.

### 2.3. Điều học được trong Hackathon mà trước đó chưa biết
Em học được sự khác nhau giữa **"Accuracy" trong ML truyền thống và "Product Metrics" (Trust/UX) trong GenAI**. Một cái app AI dù sinh ra text hay chăng nữa nhưng trả lời quá chậm (Latency P95 tồi), hoặc khi không biết mà vẫn cố trả lời sai kiến thức môn học (mà không hiển thị Confidence Score thấp) thì sinh viên sẽ lập tức mất niềm tin. Vì vậy, em học được rằng những metric đánh giá trải nghiệm và xử lý "Failure modes" (từ chối khi không biết, nhường quyền) phải được thiết kế từ khâu SPEC trước khi gõ dòng code đầu tiên.

### 2.4. Nếu làm lại, em sẽ thay đổi gì?
Nếu làm lại có thêm thời gian, thay vì làm Frontend tĩnh dùng Vanilla JS (tại `src/api/static`), em sẽ tách phần này ra và hiện thực hoá trên Next.js (`frontend/` đang có dự định). Next.js ecosystem cung cấp quản lý global state mượt mà hơn khi xây dựng các tính năng phức tạp như "Video player states gắn kết trực tiếp với Chat Overlay", việc handle Event Listeners cho Proactive chat popup sẽ ít bị lỗi vặt và code dễ tái sử dụng hơn. Ngoài ra, em sẽ dùng Tool Calling tích hợp chuẩn thay vì phụ thuộc hoàn toàn vào hệ thống prompt raw.

### 2.5. AI giúp gì? AI sai/mislead ở đâu?
- **Giúp ích**: Dùng AI để build boilerplate kiến trúc FastAPI & SQLAlchemy, UI Admin Dashboard, cũng như tạo logic Streaming LLM chunks mất cực ít thời gian. Nó cũng là một người bạn tốt lúc brainstorm những case "Failure Modes" cho báo cáo SPEC.
- **Fail / Mislead**: LLM có xu hướng "Over-Engineer" nếu thiếu gờ giảm tốc. Ví dụ khi em nhờ tạo một flow "Agent", AI tự sinh ra toàn bộ `src/agent.py` rất mạnh mẽ có đủ loop và tools xử lý tác vụ... nhưng nó lại nằm ngoài luồng phục vụ lõi của `app.py`. Do vậy nó khiến tốn thời gian xử lý và làm bộ khung trở nên cồng kềnh với deadline của một Hackathon. Bài học là ta phải điều hướng và vạch giới hạn phạm vi rành mạch cho GenAI để không bị dư thừa (scope creep).
