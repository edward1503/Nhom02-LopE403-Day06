# ROI 3 kịch bản

Ước lượng ROI cho 3 trường hợp: conservative, realistic, optimistic. Không cần chính xác — quan trọng là tư duy "có đáng build không?"

---

## Template

|   | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** |   |   |   |
| **Cost** |   |   |   |
| **Benefit** |   |   |   |
| **Net** |   |   |   |

**Kill criteria:** khi nào nên dừng? ___

---

## Ví dụ: AI phân loại email

|   | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | 100 user, 50% dùng thường xuyên | 500 user, 70% dùng thường xuyên | 2000 user, 85% dùng thường xuyên |
| **Cost** | $50/ngày (API + infra) | $200/ngày | $500/ngày |
| **Benefit** | Mỗi user tiết kiệm 15 phút/ngày → 12.5 giờ/ngày tổng | 58 giờ/ngày | 425 giờ/ngày |
| **Net** | Tiết kiệm ~$300/ngày − $50 = +$250 | +$1160/ngày | +$9750/ngày |

**Kill criteria:** acceptance rate <50% sau 1 tháng, hoặc cost > benefit 2 tháng liên tục.

---

## Hướng dẫn

- **Assumption:** số user, tỷ lệ adoption, mức sử dụng — điều chỉnh giữa 3 kịch bản
- **Cost:** inference API + infrastructure + nhân lực maintain
- **Benefit:** thời gian tiết kiệm, giảm nhân lực, tăng revenue, giảm churn — quy đổi ra tiền
- **Net:** benefit − cost. Nếu conservative đã dương → signal tốt
- **Kill criteria:** đặt TRƯỚC khi build — tránh sunk cost fallacy
- Nhớ: cost inference giảm nhanh (~100x trong 2 năm) — worst case hôm nay ≠ worst case 6 tháng sau
