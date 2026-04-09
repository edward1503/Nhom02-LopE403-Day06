# Tổng Quan Dự Án: AI Tutor Overlay (VinSchool)

**Nhóm:** Nhom02-403
**Track:** VinUni-VinSchool
**Giai đoạn:** Mock Prototype (Hackathon Day 6)

## 📌 1. Tóm tắt dự án (Problem & Solution)
**Vấn đề (Pain point):** Sinh viên học online thường xuyên bị gián đoạn tư duy khi phải chuyển tab sang các công cụ tìm kiếm hoặc AI khác để giải đáp thắc mắc trong bài giảng (slide/video). Việc này khiến luồng học tập (flow) bị đứt gãy.
**Giải pháp (Solution):** **AI Tutor Overlay** là một chatbot được nhúng trực tiếp lên trên giao diện nền tảng học tập online. Hệ thống có khả năng ngầm hiểu các nội dung đang hiển thị trên màn hình (thông qua slide PDF hoặc Video Transcript) và giải thích các khái niệm ngay tại chỗ trong thời gian siêu nhanh (dưới 2 giây).

## ✨ 2. Các Tính Năng Cốt Lõi (User Stories)
1. **Giải thích khái niệm theo ngữ cảnh (Context-aware Explanation):** 
   - Kích hoạt khi sinh viên bôi đen hoặc hỏi một thuật ngữ từ slide/video.
   - AI đọc text từ slide trang hiện tại và trả về câu trả lời chỉ dựa trên nội dung khóa học.
   - Tất cả câu trả lời đều đi kèm **Badge trích dẫn "Nguồn tham khảo"** để kiểm chứng.
2. **Gợi ý chủ động khi học (Proactive AI Suggestion):** 
   - Kích hoạt tự động khi sinh viên dừng (pause) video khóa học > 3 giây hoặc di chuột (hover) vào thuật ngữ lạ.
   - Một chip nhỏ sẽ gợi ý: *"Bạn muốn hiểu rõ hơn về '[khái niệm]' không?"*. Sinh viên có thể bỏ qua hoặc xem ngay giải thích.
3. **Hội thoại theo ngữ cảnh (Follow-up Dialogue):**
   - Sinh viên có thể tiếp tục hỏi sâu hơn mà hệ thống vẫn duy trì được context xuyên suốt từ phía slide và các câu hỏi trước đó.

## 🛠 3. Công nghệ sử dụng
- **AI Model:** Google Gemini 2.0 Flash (API) - Lựa chọn hàng đầu nhờ xử lý đa phương thức (multimodal), tốc độ trả lời siêu tốc (latency ~1-1.5s), phù hợp ở quy mô MVP. Ngoài ra khung dự án cũng hỗ trợ Anthropic Claude API (`src/agent.py`).
- **Backend & Data Pipeline:** 
  - Backend sử dụng python cho Agent/Workflow orchestration. Hệ thống mock RAG Pipeline (với ingestion script mẫu cho môn CS231n trong `scripts/`).
- **Frontend / Prototyping:** 
  - Khởi tạo UI nhanh chóng thông qua Claude Artifacts / Bolt.new / Lovable được export dưới dạng static web.
  - Tích hợp thư viện **PDF.js** ngay trên trình duyệt để nhúng slide, bóc tách chữ (extract text/OCR) tức thì.

## 📊 4. Product Specs & Baseline Metrics
Với sản phẩm AI dành cho giáo dục, Nhóm 02 xác định ưu tiên **Precision thay vì Recall**. Thông tin bịa đặt (hallucinate) để lại rủi ro nguy hiểm vì sinh viên sẽ vô tình nạp kiến thức sai nếu bị AI đánh lừa.
- **Tỷ lệ "Đã hiểu" (User Feedback):** Mục tiêu kỳ vọng đạt `>= 75%`.
- **Latency (Tốc độ phản hồi ưu tiên P95):** Mục tiêu `<= 2.0s`. Chậm hơn sẽ làm đứt luồng tư duy.
- **Tỷ lệ Hallucination:** Mục tiêu khắt khe `<= 5%` (Red flag nếu tỷ lệ vượt ngưỡng 15%).

## ⚠ 5. Failure Modes và Mitigation (Xử lý sự cố)
1. **Ngữ cảnh rỗng (Video không có transcript):** 
   - *Hậu quả:* Hệ thống thiếu thông tin gốc dẫn đến AI phải "đoán mò". (Failure cực nguy hiểm)
   - *Biện pháp:* Thuật toán sẽ chủ động nhận diện mức độ availability của các transcript và hiển thị banner cảnh báo: *"Video chưa có transcript, AI có khả năng nhầm lẫn, hãy tự đối chiếu"*.
2. **Hallucination do AI bịa thông tin xa lạ:** 
   - *Biện pháp:* Khóa không cho AI tự sáng tạo thông qua system prompt cứng và RAG engine. AI sẽ từ chối trả lời nếu thuật ngữ không xuất hiện trong kho tài liệu khóa học.
3. **Làm phiền do gợi ý tự động quá nhiều (Proactive Spam):**
   - *Biện pháp:* Áp dụng cơ chế Rate Limit (Giới hạn tối đa 2 lần suggest/10 phút). Nếu nhận liên tiếp 3 lệnh "Dismiss", AI sẽ im lặng (tắt feature) cho đến khi nhận được yêu cầu chủ động từ user.

## 📈 6. Đánh Giá ROI (Return on Investment)
Ngay ở mức đánh giá thận trọng nhất (**Conservative**):
- **Chi phí vận hành API:** ~ 50 queries/ngày khoảng $0.25/ngày (Rất rẻ do sử dụng model token giá thấp).
- **Lợi ích thực tế:** Tiết kiệm trung bình khoảng 150 phút học tập không bị đứt luồng cho sinh viên học thử. Giảm rủi ro mất chú ý khi mở các trình duyệt khác (cognitive load / context switching).
- **Kết luận:** Dự án có tính thực tiễn cực cao, tỷ suất hoàn vốn dương ở viễn cảnh nhỏ nhất và có khả năng scale thành SaaS nhúng lên hệ thống học trực tuyến của VinSchool hoặc toàn quốc.
