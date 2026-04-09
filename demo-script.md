# Demo Script — AI Tutor Overlay (VinSchool)
## Thời lượng: 2 phút | Nhóm 02-403

---

## Phân vai

| Thời điểm | Người nói | Người thao tác máy |
|-----------|-----------|-------------------|
| 0:00–0:20 | **Đức** (Problem) | — |
| 0:20–0:40 | **Đức** (Solution) | — |
| 0:40–1:40 | **Đức** (commentary) | **Hoàng** (thao tác prototype) |
| 1:40–2:00 | **Quân** (Lessons learned) | — |

---

## Script chi tiết

---

### [0:00 – 0:20] Vấn đề

> **Đức nói:**
>
> "Các bạn học online bao giờ gặp cảnh này chưa — đang xem slide, gặp một khái niệm không hiểu, phải mở tab mới, Google, đọc, rồi quay lại slide — mất 2–3 phút, mất hết mạch học.
>
> Đây là vấn đề của hầu hết sinh viên VinSchool khi học qua LMS."

---

### [0:20 – 0:40] Giải pháp

> **Đức nói:**
>
> "AI Tutor Overlay giải quyết điều đó bằng cách đưa AI vào ngay trong giao diện học — sinh viên hỏi, AI trả lời dựa trên nội dung slide đang mở, trong vòng 2 giây, không cần rời trang.
>
> AI ở đây là Augmentation — AI gợi ý, sinh viên quyết định. Mình luôn kiểm soát."

---

### [0:40 – 1:40] Demo live — 3 bước

> **Hoàng mở prototype. Đức commentary.**

**Bước 1 — Happy path (20 giây):**

> *Hoàng:* Mở slide, navigate đến trang có thuật ngữ *"Đạo hàm riêng"*. Bôi đen → nhấn "Hỏi AI".
>
> *Đức:* "AI đọc text từ slide trang này — không phải kiến thức chung — và trả lời trong 1–2 giây. Mọi câu trả lời đều kèm badge nguồn: Slide trang mấy."
>
> *Hoàng:* Nhấn "Đã hiểu". Overlay đóng.

**Bước 2 — Low-confidence path (20 giây):**

> *Hoàng:* Gõ câu hỏi: *"Higgs boson là gì?"* — thuật ngữ không có trong slide.
>
> *Đức:* "AI không tìm thấy trong tài liệu — thay vì bịa, nó nói thẳng: 'Không tìm thấy thông tin này trong slide hiện tại.' Đây là điểm thiết kế quan trọng nhất — thà không trả lời còn hơn trả lời sai."

**Bước 3 — Correction path (20 giây):**

> *Hoàng:* Hỏi một câu về *"Gradient descent"*, AI trả lời → nhấn "Báo sai" → điền nội dung đúng.
>
> *Đức:* "Mỗi lần báo sai, hệ thống học. Đây là data flywheel của mình — data từ sinh viên VinSchool, domain-specific, model ngoài không có được."

---

### [1:40 – 2:00] Bài học & Failure mode chính

> **Quân nói:**
>
> "Failure mode nguy hiểm nhất của mình là video không có transcript — AI thiếu context, trả lời chung chung mà trông vẫn có vẻ đúng. Sinh viên không biết mình đang bị sai.
>
> Mitigation: hệ thống detect trước và hiển thị cảnh báo rõ ràng thay vì để AI im lặng mà sai."

---

## Checklist trước khi demo

- [ ] Slide test PDF đã tải sẵn trong prototype
- [ ] Gemini API key đã set, test 1 câu hỏi thành công
- [ ] Kết nối mạng ổn định (backup: dùng hotspot điện thoại)
- [ ] Ảnh backup ở `extras/demo-screenshots/` đã mở sẵn tab thứ 2
- [ ] Bật chế độ không làm phiền, tắt thông báo
- [ ] Mỗi thành viên biết đúng phần mình nói
- [ ] Đã dry run ít nhất 1 lần đồng hồ bấm giờ

---

## Câu hỏi thường gặp từ audience

| Câu hỏi | Người trả lời | Gợi ý trả lời |
|---------|--------------|----------------|
| "Sao không dùng ChatGPT thẳng?" | Đức | "ChatGPT không biết slide bạn đang xem là gì. Mình inject context slide vào prompt — đó là sự khác biệt." |
| "Nếu AI sai thì sao?" | Quân | "Có 2 lớp bảo vệ: (1) RAG chỉ trả lời từ tài liệu; (2) nếu không có trong tài liệu, AI từ chối thay vì bịa." |
| "Latency 2 giây có đủ nhanh không?" | Hoàng | "Test thực tế 1.2–1.8s. Nhanh hơn thời gian mở tab Google mới." |
| "Scale lên 1.000 sinh viên được không?" | Phúc | "Gemini 2.0 Flash $0.075/1M token. 1.000 queries/ngày ~ $5/ngày — $150/tháng. ROI dương từ kịch bản conservative." |
