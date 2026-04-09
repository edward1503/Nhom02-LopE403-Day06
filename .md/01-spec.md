# SPEC FINAL — Nhóm 02-403

**Nhóm:** Nhom02-403
**Track:** ✅ VinUni-VinSchool
**Problem statement:** Sinh viên học online bị gián đoạn tư duy khi phải chuyển tab sang công cụ tìm kiếm/AI bên ngoài để giải đáp thắc mắc trong bài giảng — AI Tutor Overlay giải thích khái niệm ngay lập tức dựa trên nội dung đang hiển thị, không cần rời giao diện học.

---

## 1. AI Product Canvas

|   | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi** | User nào? Pain gì? AI giải quyết gì? | Khi AI sai thì sao? User phát hiện và sửa bằng cách nào? | Chi phí/latency bao nhiêu? Rủi ro kỹ thuật chính? |
| **Trả lời** | **User:** Sinh viên VinSchool đang học qua LMS/video/slide. **Pain:** Gặp khái niệm khó → tốn 2–3 phút chuyển tab search + mất mạch tư duy. **AI giải quyết:** Overlay hiểu ngữ cảnh slide/video đang mở, giải thích tại chỗ trong <2 giây. | AI giải thích sai (hallucination) → sinh viên học sai kiến thức mà không biết. **Mitigation:** Mỗi câu trả lời bắt buộc kèm badge "Nguồn tham khảo" dẫn tới đoạn slide/video cụ thể. Nút "Báo sai" ghi correction log. | **API:** Gemini 2.0 Flash hoặc GPT-4o Vision. **Latency:** <2s (P95) cho text-based query; <4s nếu cần OCR hình ảnh. **Chi phí:** ~$0.003–0.01/truy vấn. **Rủi ro chính:** Video không có transcript → thiếu ngữ cảnh sâu. |
| **Row 2** | "Just-in-time learning": AI không chỉ trả lời khi được hỏi mà còn gợi ý chủ động khi sinh viên hover/pause >3 giây lên một thuật ngữ. Giảm friction xuống gần 0. | Nguồn tham khảo luôn hiển thị. Khi không đủ ngữ cảnh, AI trả lời: *"Không tìm thấy thông tin trong tài liệu hiện tại"* — tránh hallucination hoàn toàn. | OCR slide bằng Tesseract/Google Vision API. Transcript video xử lý theo timestamp (chunked). Prototype MVP: chỉ cần slide PDF + câu hỏi text. |

**Automation hay Augmentation?** ✅ **Augmentation**

> Justify: AI đề xuất giải thích, sinh viên đọc và chủ động đánh dấu "Đã hiểu" hoặc hỏi tiếp. Cost of reject = 0 (chỉ đóng overlay). Không có hành động tự động nào ảnh hưởng tới tiến độ học của sinh viên.

**Learning signal:**

1. **User correction đi vào đâu?** → Nút "Báo sai" ghi vào correction log kèm context (slide/video timestamp, câu hỏi, câu trả lời gốc). Dùng để fine-tune prompt hoặc filter lại RAG index.
2. **Product thu signal gì để biết tốt lên hay tệ đi?** → Tỷ lệ "Đã hiểu" / tổng lượt trả lời; tỷ lệ hỏi follow-up về cùng khái niệm (tín hiệu câu trả lời chưa đủ); thời gian sinh viên ở lại trong LMS sau khi dùng AI so với không dùng.
3. **Data thuộc loại nào?** ✅ Domain-specific (nội dung bài giảng VinSchool) + ✅ Human-judgment (đánh giá "Đã hiểu" / "Báo sai").
   Có marginal value không? **Có** — mô hình nền (Gemini/GPT-4o) chưa biết nội dung bài giảng cụ thể của từng môn học. RAG trên tài liệu course là nguồn context có giá trị biên rõ ràng.

---

## 2. User Stories — 4 Paths

### Feature 1: Giải thích khái niệm theo ngữ cảnh (Context-aware Explanation)

**Trigger:** Sinh viên nhấn nút "Hỏi AI" hoặc bôi đen thuật ngữ trong slide → Overlay mở, hệ thống thu OCR slide hiện tại + timestamp video + câu hỏi của sinh viên → gửi lên AI.

| Path | Câu hỏi thiết kế | Mô tả chi tiết |
|------|------------------|----------------|
| **Happy — AI đúng, tự tin** | User thấy gì? Flow kết thúc ra sao? | AI trả về giải thích rõ ràng (<2s), kèm badge "Nguồn: Slide 7 / 01:23 video". Sinh viên đọc, thấy đúng, nhấn **"Đã hiểu"** → overlay đóng, tiếp tục học. Signal ghi nhận: +1 "Đã hiểu". |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? User quyết thế nào? | AI phát hiện thuật ngữ không có trong RAG index của course → hiển thị câu trả lời kèm banner vàng: *"AI không tìm thấy nội dung này trong tài liệu khóa học. Câu trả lời dựa trên kiến thức chung — hãy xác minh lại."* Sinh viên có thể chọn "Xem nguồn ngoài" (link Google Scholar) hoặc đóng overlay. |
| **Failure — AI sai** | User biết AI sai bằng cách nào? Recover ra sao? | AI trả lời không chính xác nhưng không có banner cảnh báo (silent failure). Sinh viên nhận ra sai sau khi kiểm tra với giảng viên → nhấn **"Báo sai"** → form nhỏ xuất hiện: "Câu trả lời đúng là gì?" → ghi correction log. |
| **Correction — user sửa** | User sửa bằng cách nào? Data đó đi vào đâu? | Sinh viên điền nội dung đúng vào form "Báo sai" → hệ thống lưu cặp (câu hỏi, context, câu trả lời sai, câu trả lời đúng) → correction log → dùng để cập nhật RAG index hoặc prompt filter sau mỗi sprint. |

---

### Feature 2: Gợi ý chủ động khi học (Proactive AI Suggestion)

**Trigger:** Sinh viên pause video ≥3 giây HOẶC di chuột hover lên một thuật ngữ được gạch chân tự động bởi hệ thống → AI gợi ý nhẹ nhàng.

| Path | Câu hỏi thiết kế | Mô tả chi tiết |
|------|------------------|----------------|
| **Happy — AI đúng, tự tin** | User thấy gì? Có làm phiền không? | Chip gợi ý nhỏ xuất hiện góc phải: *"Bạn muốn hiểu rõ hơn về '[tên khái niệm]' không?"* Sinh viên nhấn "Có" → overlay mở giải thích ngay. Sinh viên nhấn "Không" hoặc bỏ qua sau 4s → chip tự mất. |
| **Low-confidence — AI không chắc** | System báo "không chắc" bằng cách nào? | Nếu hệ thống không nhận diện được thuật ngữ rõ ràng (OCR mờ, không match RAG) → không hiển thị chip gợi ý. Nguyên tắc: "Thà không gợi ý còn hơn gợi ý sai context". |
| **Failure — AI sai** | AI gợi ý sai khái niệm (nhầm thuật ngữ) | Chip gợi ý hiện tên thuật ngữ sai → sinh viên thấy không liên quan → nhấn **"X"** để đóng. Hệ thống ghi nhận dismiss signal → giảm probability gợi ý cho context tương tự. |
| **Correction — user sửa** | User sửa bằng cách nào? | Sau khi dismiss, sinh viên có thể nhấn "Hỏi điều khác" để tự gõ câu hỏi. Dismiss log giúp hệ thống học: thuật ngữ nào không đáng gợi ý chủ động. |

---

### Feature 3: Hội thoại theo ngữ cảnh tiếp nối (Follow-up Dialogue)

**Trigger:** Sau khi AI trả lời, sinh viên nhấn **"Hỏi tiếp"** hoặc gõ câu hỏi follow-up liên quan — overlay ở lại, AI duy trì ngữ cảnh hội thoại.

| Path | Câu hỏi thiết kế | Mô tả chi tiết |
|------|------------------|----------------|
| **Happy — AI đúng, tự tin** | Hội thoại đa lượt có giữ ngữ cảnh không? | AI nhớ slide/video context và lịch sử Q&A trong phiên hiện tại. Sinh viên hỏi sâu hơn → AI mở rộng giải thích dựa trên câu trước. Sau 3–5 lượt → sinh viên nhấn "Đã hiểu" hoặc đóng overlay. |
| **Low-confidence — AI không chắc** | AI trả lời vòng vo, không tiến triển? | Sau 3 câu hỏi follow-up về cùng một khái niệm → hệ thống tự gợi ý: *"Bạn muốn xem lại phần này trong video không? [Link timestamp]"* — escalate lên nguồn gốc thay vì tiếp tục giải thích loanh quanh. |
| **Failure — AI sai** | AI mất mạch, trả lời không liên quan? | AI confuse context của câu hỏi mới với câu hỏi cũ → sinh viên thấy câu trả lời lạc đề. Có nút **"Hỏi lại từ đầu"** reset conversation context. |
| **Correction — user sửa** | User khởi động lại hội thoại | Nhấn "Hỏi lại từ đầu" → clear conversation history, giữ nguyên slide/video context. Sinh viên gõ lại câu hỏi rõ hơn. |

---

## 3. Eval Metrics + Threshold

**Optimize precision hay recall?** ✅ **Precision**

> **Tại sao:** Trong ngữ cảnh giáo dục, một câu trả lời sai nhưng trông có vẻ đúng (false positive) gây hại nhiều hơn việc AI từ chối trả lời (false negative). Sinh viên học sai kiến thức chuyên môn khó sửa hơn việc không có câu trả lời.
>
> **Nếu chọn recall thay vì precision:** AI sẽ trả lời nhiều hơn nhưng kèm nhiều thông tin không chính xác → sinh viên mất dần niềm tin → bỏ dùng overlay hoàn toàn.

| Metric | Định nghĩa | Threshold (mục tiêu) | Red flag (dừng/review) |
|--------|------------|----------------------|------------------------|
| **Tỷ lệ "Đã hiểu"** | % câu trả lời được sinh viên đánh dấu "Đã hiểu" / tổng lượt AI trả lời | ≥ 75% | < 50% trong 3 ngày liên tiếp |
| **Tỷ lệ hallucination** | % câu trả lời bị báo sai ("Báo sai") / tổng lượt AI trả lời | ≤ 5% | > 15% trong bất kỳ ngày nào |
| **Latency P95** | 95th percentile thời gian từ khi gửi câu hỏi đến khi overlay hiển thị câu trả lời | ≤ 2.0s | > 4.0s (phá vỡ mạch học) |

---

## 4. Top 3 Failure Modes

> *"Failure mode nào sinh viên KHÔNG BIẾT bị sai? Đó là cái nguy hiểm nhất."*

| # | Trigger | Hậu quả | Loại failure | Mitigation |
|---|---------|----------|-------------|------------|
| **1** | Video bài giảng không có transcript hoặc transcript không sync timestamp | AI không có context sâu → trả lời bằng kiến thức chung → câu trả lời nghe hợp lý nhưng không khớp nội dung bài giảng (silent failure — sinh viên không biết sai) | **Hidden failure** (nguy hiểm nhất) | (a) Phát hiện trước: kiểm tra transcript availability khi mở video → báo động "⚠ Video này chưa có transcript — câu trả lời AI có thể kém chính xác". (b) Hỗ trợ giảng viên upload transcript thủ công qua admin panel. |
| **2** | AI hallucinate định nghĩa khái niệm chuyên môn ngoài domain training (e.g., thuật ngữ toán học nâng cao, y sinh) với confidence cao | Sinh viên học định nghĩa sai, không có cảnh báo. Phát hiện muộn (khi thi hoặc được giảng viên chỉnh) → mất niềm tin vào toàn bộ hệ thống | **Hidden failure** | RAG bắt buộc: chỉ trả lời dựa trên nội dung trong tài liệu course đã index. Nếu không tìm thấy trong RAG → banner vàng cảnh báo + từ chối trả lời hoặc đề xuất nguồn ngoài. |
| **3** | Gợi ý chủ động (proactive chip) xuất hiện quá thường xuyên trong một phiên học | Sinh viên cảm thấy bị làm phiền → dismiss liên tục → tắt hẳn tính năng overlay → mất toàn bộ giá trị của sản phẩm (user abandonment) | **Visible failure** (nhưng khó nhận ra pattern) | Rate limit: tối đa 2 proactive suggestion / 10 phút / sinh viên. Sau 3 lần dismiss liên tiếp → tắt proactive mode cho phiên đó, chỉ active lại khi sinh viên chủ động hỏi. |

---

## 5. ROI — 3 Kịch bản

**Context:** VinSchool có ~3.000 học sinh/sinh viên có thể tiếp cận LMS. Prototype triển khai pilot cho 1 lớp (~30 người) trước.

|   | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | 200 SV/ngày, 50% dùng overlay ít nhất 1 lần, 60% hài lòng (đánh "Đã hiểu") | 600 SV/ngày, 70% dùng, 78% hài lòng | 1.500 SV/ngày, 85% dùng, 88% hài lòng |
| **Cost (inference)** | ~50 queries/ngày × $0.005/query = **$0.25/ngày** ($7.5/tháng) | ~300 queries/ngày × $0.005 = **$1.5/ngày** ($45/tháng) | ~1.000 queries/ngày × $0.005 = **$5/ngày** ($150/tháng) |
| **Benefit** | Tiết kiệm 1.5 phút/SV/ngày × 100 SV = 150 phút học liền mạch/ngày. Giảm 1 tab switch/SV → giảm cognitive load. | Tiết kiệm 350 phút/ngày. Tăng retention trên LMS ước tính +8%. Giảm số câu hỏi giảng viên nhận trên chat ~15%. | Tiết kiệm 1.200 phút/ngày. Tăng retention +15%. Giảng viên giảm ~30% câu hỏi lặp lại. Có thể nhân rộng sang toàn bộ VinSchool. |
| **Net** | Benefit rõ ràng (thời gian + focus) >> cost $7.5/tháng. **Dương ngay từ conservative.** | Cost $45/tháng vs benefit định tính lớn. Break-even rõ ràng nếu tính 1 giờ giảng viên = $10. | Cost $150/tháng vs ROI lớn khi scale. Có thể thương mại hóa thành SaaS cho các trường khác. |

**Kill criteria:** Dừng hoặc pivot nếu sau 2 tuần pilot:
- Tỷ lệ "Đã hiểu" < 50% (AI không đủ chất lượng)
- Tỷ lệ hallucination > 20% (nguy hiểm cho học thuật)
- Hơn 60% sinh viên tắt overlay sau phiên đầu tiên (UX friction quá cao)

---

## 6. Mini AI Spec (Tóm tắt tự do)

**AI Tutor Overlay — VinSchool**

Sản phẩm giải quyết vấn đề gián đoạn luồng học tập của sinh viên khi học online: mỗi khi gặp khái niệm không hiểu, sinh viên phải rời LMS, mở tab mới, tìm kiếm, rồi quay lại — quy trình này mất 2–3 phút và phá vỡ mạch tư duy. AI Tutor Overlay là một lớp phủ nhẹ nhàng ngay trên giao diện LMS/video, có thể trả lời câu hỏi dựa trên nội dung đang hiển thị (OCR slide, video transcript theo timestamp) trong vòng 2 giây.

**AI làm gì:** Augmentation — AI đề xuất giải thích, sinh viên quyết định chấp nhận/bỏ qua/hỏi thêm. Không có bước học tự động nào không qua tay sinh viên.

**Quality target:**
- Precision > Recall: thà không trả lời còn hơn trả lời sai. Mọi câu trả lời bắt buộc kèm nguồn tham khảo.
- Latency < 2s: nếu chậm hơn, phá vỡ mạch học — không còn ý nghĩa overlay.
- Hallucination rate ≤ 5%: đây là red line vì product đang phục vụ học thuật.

**Risk chính:** Video không có transcript là failure mode nguy hiểm nhất (hidden failure — AI trả lời chung chung trông có vẻ đúng). Mitigation: detect trước khi trả lời, hiển thị cảnh báo rõ ràng.

**Data flywheel:** Mỗi lượt "Đã hiểu" / "Báo sai" / dismiss là signal để cải thiện RAG index và prompt. Data này domain-specific (nội dung VinSchool) nên có marginal value cao — model nền không có sẵn. Sau 3–6 tháng tích lũy, hệ thống sẽ có lợi thế rõ rệt so với chatbot generic bên ngoài.

**Đội triển khai:**
- Quân: Failure modes & mitigation strategy
- Đức: User stories 4 paths (tài liệu này)
- Phúc: Eval metrics & ROI
- Hoàng: Prototype research & prompt engineering test
- Luân: Canvas