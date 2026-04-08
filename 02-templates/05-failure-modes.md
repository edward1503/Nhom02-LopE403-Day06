# Top 3 failure modes

Liệt kê cách product có thể fail — không phải list features.

> **"Failure mode nào user KHÔNG BIẾT bị sai? Đó là cái nguy hiểm nhất."**

---

## Template

| # | Trigger | Hậu quả | Mitigation |
|---|---------|---------|------------|
| 1 |   |   |   |
| 2 |   |   |   |
| 3 |   |   |   |

---

## Ví dụ

| # | Trigger | Hậu quả | Mitigation |
|---|---------|---------|------------|
| 1 | **Chatbot y tế:** bệnh nhân hỏi triệu chứng hiếm, ngoài training data | AI trả lời tự tin nhưng sai — **user không biết bị sai**, tin và tự điều trị | Detect domain ngoài scope → trả lời "Tôi không đủ thông tin, hãy hỏi bác sĩ" thay vì đoán |
| 2 | **Recommendation engine:** user mua quà cho người khác, pattern khác hẳn lịch sử | AI gợi ý sản phẩm hoàn toàn sai domain, user mất thời gian lọc | Cho user chọn context ("mua cho ai?") trước khi gợi ý. Reset recommendation khi detect mua ngoài pattern |
| 3 | **AI agent gửi email:** user duyệt nhanh, không đọc kỹ draft AI viết | Email gửi đi có thông tin sai hoặc tone không phù hợp — **đã gửi rồi, không recall được** | Highlight phần AI thay đổi so với template. Delay gửi 30 giây + nút undo |

---

## Cách nghĩ failure modes

1. Failure mode nào user THẤY ngay? → ít nguy hiểm (user tự sửa)
2. Failure mode nào user KHÔNG BIẾT? → nguy hiểm nhất (thiệt hại âm thầm)
3. Failure mode nào ĐÃ XẢY RA rồi mới biết? → cần prevention, không chỉ detection
4. Nghĩ từ góc automation/augmentation: automation → failure ngầm nhiều hơn
