# Prototype README — AI Tutor Overlay (VinSchool)

**Nhóm:** Nhom02-403
**Track:** VinUni-VinSchool
**Mức độ prototype:** Mock Prototype (UI tương tác + AI call thật trên demo flow)

---

## 1. Mô tả Prototype

AI Tutor Overlay là một chatbot overlay nhúng trực tiếp vào giao diện xem bài giảng. Prototype MVP tập trung vào **1 luồng chính**: sinh viên xem slide PDF → gặp khái niệm khó → nhấn "Hỏi AI" → overlay mở → AI trả lời dựa trên nội dung slide đang xem → sinh viên đánh giá.

### Những gì prototype làm được (In scope)
- Tải slide PDF và hiển thị từng trang
- Sinh viên bôi đen thuật ngữ hoặc gõ câu hỏi tự do
- Hệ thống OCR/extract text từ slide trang hiện tại → gửi làm context cho AI
- AI (Gemini 2.0 Flash hoặc GPT-4o) trả lời kèm badge "Nguồn: Slide [số trang]"
- Nút phản hồi: "Đã hiểu" / "Hỏi tiếp" / "Báo sai"
- Hội thoại follow-up đa lượt trong phạm vi cùng slide

### Những gì chưa làm (Out of scope cho demo)
- Tích hợp video player thật + transcript theo timestamp
- Proactive suggestion (hover/pause detection)
- Persistent correction log database
- Authen/phân quyền theo từng sinh viên

---

## 2. Công cụ & Công nghệ

| Layer | Công cụ | Lý do chọn |
|-------|---------|------------|
| **AI Model** | Google Gemini 2.0 Flash (API) | Free tier đủ cho demo; multimodal (xử lý được ảnh slide); latency thấp ~1–1.5s |
| **Frontend** | Claude Artifacts / Bolt.new / Lovable | Không cần backend; tạo UI nhanh trong vài giờ; export thành static page |
| **PDF rendering** | PDF.js (nhúng trong browser) | Hiển thị slide trực tiếp trong overlay, extract text từng trang |
| **Prompt layer** | System prompt + RAG context injection | Giới hạn AI chỉ trả lời từ context slide → giảm hallucination |
| **Demo environment** | Browser localhost hoặc Vercel deploy | Chạy được không cần cài đặt phức tạp khi demo trực tiếp |

---

## 3. Kiến trúc Prototype (Flow kỹ thuật)

```
[Sinh viên] 
    → [Tải slide PDF] 
    → [PDF.js render trang hiện tại + extract text]
    → [Sinh viên gõ câu hỏi / bôi đen text]
    → [Frontend gửi: {context: text_trang_hien_tai, question: cau_hoi_sinh_vien}]
    → [Gemini API với system prompt "chỉ trả lời từ context sau:"]
    → [Nhận response + source citation]
    → [Overlay hiển thị câu trả lời + badge nguồn + nút feedback]
    → [Feedback ghi vào localStorage (correction log đơn giản)]
```

**System prompt cốt lõi:**
```
Bạn là AI Tutor hỗ trợ sinh viên VinSchool. Chỉ trả lời dựa trên nội dung tài liệu được cung cấp bên dưới. 
Nếu câu hỏi không liên quan đến tài liệu, hãy nói: "Không tìm thấy thông tin này trong tài liệu hiện tại."
Luôn trích dẫn phần tài liệu bạn dùng để trả lời.
Trả lời bằng tiếng Việt, ngắn gọn (≤150 từ).

[CONTEXT — Nội dung slide hiện tại]
{slide_text}

[CÂU HỎI]
{student_question}
```

---

## 4. Phân công Demo

| Thành viên | Vai trò trong Demo | Cụ thể |
|------------|-------------------|--------|
| **Hoàng** | Người điều khiển prototype | Chạy demo trực tiếp, thao tác trên máy |
| **Đức** | Người thuyết trình flow | Giải thích 4 paths khi Hoàng demo từng bước |
| **Phúc** | Người trình bày ROI & metrics | Trình bày slide ROI sau khi demo live kết thúc |
| **Quân** | Người trả lời failure modes | Trả lời câu hỏi của audience về cách xử lý khi AI sai |

---

## 5. Cách chạy Prototype

### Option A — Chạy trực tiếp (đã deploy)
Truy cập link: *(điền link Vercel/Bolt sau khi deploy)*

### Option B — Chạy local
```bash
# Clone repo
git clone https://github.com/[team-repo]/Nhom02-403-Day06

# Cài dependencies (nếu dùng Node)
npm install

# Thêm API key vào .env
GEMINI_API_KEY=your_key_here

# Chạy
npm run dev
# Mở http://localhost:3000
```

### Backup plan (nếu demo live fail)
- Mở file `extras/demo-screenshots/` — ảnh chụp màn hình từng bước đã chuẩn bị trước
- Dùng video recording `extras/demo-recording.mp4` (quay sẵn từ đêm hôm trước)
- Trình bày flow qua slide thay vì live demo

---

## 6. Slide Test cho Demo

File slide test được đặt tại `extras/test-slide.pdf` — là slide bài giảng môn Toán/Lý VinSchool có sẵn các thuật ngữ kỹ thuật để demo:
- *"Đạo hàm riêng"* — để demo happy path
- *"Gradient descent"* — để demo follow-up dialogue
- *"Higgs boson"* (thuật ngữ ngoài slide) — để demo low-confidence path

---

## 7. Ghi chú kỹ thuật

- Gemini 2.0 Flash free tier: 15 requests/phút — đủ cho demo nhưng không chạy cho 600 user đồng thời
- Để scale: chuyển sang Gemini 2.0 Flash paid ($0.075/1M tokens) hoặc GPT-4o mini
- Latency thực đo trong test: 1.2–1.8s (text-only context); 2.5–3.5s (khi thêm OCR image)
- PDF.js extract text hoạt động tốt với slide có text; slide là ảnh scan cần Google Vision API thêm ~$0.0015/trang
