# User stories — 4 paths

Mỗi feature AI chính = 1 bảng. AI trả lời xong → chuyện gì xảy ra? Viết cả 4 trường hợp.

---

## Template

### Feature: [tên feature]

**Trigger:** [user làm gì → AI phản hồi → ...]

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| **Happy** — AI đúng, tự tin | User thấy gì? Flow kết thúc ra sao? | ___ |
| **Low-confidence** — AI không chắc | System báo "không chắc" bằng cách nào? User quyết thế nào? | ___ |
| **Failure** — AI sai | User biết AI sai bằng cách nào? Recover ra sao? | ___ |
| **Correction** — user sửa | User sửa bằng cách nào? Data đó đi vào đâu? | ___ |

*Lặp lại cho mỗi feature chính.*

---

## Ví dụ: AI phân loại email

### Feature: Gợi ý nhãn email (Urgent / Action-needed / FYI)

**Trigger:** Email mới đến → AI phân tích subject + sender + nội dung → gợi ý nhãn.

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| **Happy** | User thấy gì? Flow kết thúc ra sao? | Email từ sếp, subject "Deadline Friday" → AI gợi ý "Urgent" (confidence 95%) → hiện badge đỏ + lý do "từ sếp, chứa 'deadline'" → user thấy đúng, tiếp tục |
| **Low-confidence** | System báo bằng cách nào? | Newsletter tiêu đề "Action required" → AI không chắc Action-needed hay FYI (confidence 55%) → hiện 2 nhãn gợi ý + % → user chọn 1 |
| **Failure** | User biết sai bằng cách nào? | Email khiếu nại viết tiếng lóng → AI gắn "FYI" (confidence 80%) → user đọc inbox, thấy sai → sửa thành "Urgent" |
| **Correction** | User sửa bằng cách nào? Data đi vào đâu? | User kéo thả email sang nhãn đúng → ghi correction log (sender + pattern + nhãn sửa) → retrain cuối tuần |

---

## Lưu ý

- Viết **cả 4 path** — nhiều nhóm chỉ nghĩ happy path, bỏ quên 3 cái còn lại
- Path "Failure" quan trọng nhất: user biết AI sai bằng cách nào? Nếu không biết → nguy hiểm
- Path "Correction" = nguồn data cho feedback loop — thiết kế sớm, không để sau
- Mỗi path có câu hỏi thiết kế riêng, không copy-paste
