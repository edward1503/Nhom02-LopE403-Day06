# Eval metrics + threshold

Chọn metrics, đặt threshold, xác định red flag. Câu hỏi quan trọng nhất: **optimize precision hay recall?**

## Precision hay recall?

☐ Precision — khi AI nói "có" thì thực sự đúng (ít false positive)
☐ Recall — tìm được hết những cái cần tìm (ít false negative)

**Tại sao?** ___ **Nếu sai ngược lại thì sao?** ___

## Metrics table

| Metric | Threshold | Red flag (dừng khi) |
|--------|-----------|---------------------|
|   |   |   |
|   |   |   |
|   |   |   |

## Ví dụ 1: Chatbot ngân hàng (precision-first)

**Tại sao precision?** Trả lời sai về lãi suất/phí → khách mất tiền, ngân hàng mất uy tín. False positive tệ hơn false negative ("tôi không biết").

| Metric | Threshold | Red flag |
|--------|-----------|----------|
| Precision (câu trả lời đúng/tổng trả lời) | ≥95% | <90% trong 1 tuần |
| Escalation rate (chuyển nhân viên) | <30% | >50% → AI không hữu ích |
| User satisfaction | ≥4/5 | <3/5 trong 2 tuần |

## Ví dụ 2: FAQ e-commerce (recall-first)

**Tại sao recall?** Khách hỏi mà AI không tìm được → khách bỏ đi. Bỏ sót tệ hơn gợi ý sai (khách thấy ngay, hỏi lại).

| Metric | Threshold | Red flag |
|--------|-----------|----------|
| Recall (tìm được/tổng có đáp án) | ≥90% | <80% → khách không tìm được |
| Accuracy (đúng trong số đã trả lời) | ≥80% | <70% → gợi ý sai quá nhiều |
| Deflection rate (không cần nhân viên) | ≥60% | <40% → chưa tiết kiệm nhân lực |
