# Self Reflection & Codebase Summary

**Student Name:** Nguyễn Duy Minh Hoàng
**Student ID:** 2A202600155
**Class:** E403

## 1. Tổng hợp toàn bộ codebase (Codebase Architecture Summary)

Dự án AI Tutor được thiết kế và phát triển với các thành phần có sự liên kết chặt chẽ nhằm mang lại hệ thống giáo dục trực tuyến liền mạch:

- **Frontend & UI/UX (Nền tảng học online)**:
  - Thiết kế và xây dựng giao diện người dùng (UI) trực quan, đảm bảo trải nghiệm người dùng (UX) tốt nhất cho nền tảng video học trực tuyến. 
  - Đảm bảo video player, khu vực chat với AI, và danh mục bài giảng được bố trí hợp lý, dễ thao tác và có tính thẩm mỹ.

- **Data Processing & Context Generation**:
  - Triển khai logic tự động sinh Mục lục (Table of Contents) và Tóm tắt nội dung (Summary) từ video bài giảng/transcript.
  - Đóng gói các bản tóm tắt và mục lục này làm context nền mặc định. Giúp chatbot khởi tạo với "bức tranh toàn cảnh" của bài ngay từ khi người dùng mở video.

- **Chatbot Logic & Response Formatting**:
  - Xây dựng luồng dẫn dữ liệu (feed logic) linh hoạt, bơm đúng và đủ thông tin context cần thiết vào prompt cho LLM.
  - Tùy chỉnh quy tắc định dạng đầu ra (response formatting) của chatbot, đảm bảo thông tin AI trả về được trình bày rõ ràng, cấu trúc tốt trên UI (đánh dấu in đậm, list, blockquote, code block,...).

- **System Integration & Bug Fixing**:
  - Xử lý và vá các lỗi (bug fixing) phát sinh trong suốt quá trình phát triển.
  - Đóng vai trò cầu nối tích hợp các tính năng, API và logic do các thành viên khác trong nhóm phát triển. Đảm bảo toàn bộ project chạy mượt mà, đồng bộ thành một luồng sản phẩm duy nhất chạy tốt trong Demo.

---

## 2. Self Reflection 

### 2.1. Role và Đóng góp cụ thể
- **Vai trò**: Frontend/UI-UX Developer & System Integrator (Tích hợp hệ thống).
- **Đóng góp**: 
  - Trực tiếp xây dựng UI/UX cho nền tảng học trực tuyến, mang lại cái nhìn chuyên nghiệp và hiện đại cho sản phẩm.
  - Làm chủ pipeline sinh **Table of Contents** và **Summary** cho video, tạo tiền đề để Agent có góc nhìn tổng quan. Thiết kế luồng logic để bơm các context này cho chatbot một cách khéo léo giúp hạn chế hallucination.
  - Kiểm soát định dạng (formatting) các câu trả lời của AI để văn bản hiển thị đẹp mắt, mạch lạc.
  - Xắn tay vào fix lỗi xung đột, ghép nối thành công các thành phần (giao diện, backend, api) thành một khối sản phẩm hoàn chỉnh, ổn định hoạt động mượt mà.

### 2.2. SPEC phần mạnh nhất và yếu nhất? Vì sao?
- **Mạnh nhất**: Sự liền mạch trong trải nghiệm (UI/UX) và kiến trúc xử lý Context. Việc kết hợp Table of Contents + Summary vào luồng feed mặc định cho chatbot giúp cải thiện đáng kể sự chính xác của AI. Bên cạnh đó, kinh nghiệm debug và khả năng tích hợp chéo giúp nhóm tiết kiệm nhiều thời gian thay vì bị kẹt lại ở lỗi ghép nối cuối giờ.
- **Yếu nhất**: Cơ chế feed context động dù đã có nhưng đôi khi chưa tối ưu nếu độ dài summary/ToC quá lớn gây tràn token hoặc chi phí tính toán cao. Khả năng hiển thị (formatting) đôi lúc vẫn gặp thách thức nếu AI tự sinh ra các công thức toán học khó (MathJax/KaTeX) chưa được handle triệt để trên UI.

### 2.3. Điều học được trong Hackathon mà trước đó chưa biết
Em nhận thấy rõ tầm quan trọng của việc thống nhất chuẩn giao tiếp (API Contract) và cách kiểm soát data flow. Trước đây, em thường làm các component độc lập, nhưng tham gia hackathon buộc em phải biết cách xử lý CORS, sync/async timing, và parsing dữ liệu thô dội về từ phần của người khác. Ngoài ra, việc tinh chỉnh prompt engineering tích hợp vào code thực tế giúp em hiểu cách ứng dụng LLM hiệu quả.

### 2.4. Nếu làm lại, em sẽ thay đổi gì?
Nếu có thêm thời gian, em sẽ thống nhất chi tiết các interface kết nối (API Json formats) từ sớm hơn với các bạn làm Backend để việc tích hợp trơn tru ngay từ ngày đầu. Em cũng sẽ nghiên cứu sử dụng các engine render Markdown/Math mạnh mẽ hơn ở Frontend thay vì xử lý chuỗi thủ công, đảm bảo mọi phản hồi phức tạp từ Chatbot đều hiển thị hoàn hảo.

### 2.5. AI giúp gì? AI sai/mislead ở đâu?
- **Giúp ích**: Có AI giúp tạo boilerplate code cho HTML/CSS và hỗ trợ viết các logic regex phức tạp để xử lý formatting text cực kỳ nhanh chóng. AI đồng thời đóng vai trò trợ lý nhắc lỗi khi tích hợp code từ nhiều nguồn bị sai sót typo/syntax.
- **Fail / Mislead**: Khi yêu cầu gợi ý về luồng dữ liệu tích hợp, AI đôi khi đề xuất các mẫu thiết kế (design pattern) quá cồng kềnh hoặc dùng các công cụ over-engineering không phù hợp với tiến độ một kỳ Hackathon. Nếu làm theo 100% sẽ bị chậm tiến độ, do đó cần phải tỉnh táo chọn ra cách đơn giản nhưng giải quyết đúng trọng tâm.
