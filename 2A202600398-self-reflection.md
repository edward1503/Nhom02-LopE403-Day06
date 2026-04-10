# Self Reflection & Codebase Summary

**Student Name:** [Lưu ý: Hãy điền họ và tên của bạn vào đây]
**Student ID:** 2A202600398
**Class:** E403

## 1. Tổng hợp toàn bộ codebase (Codebase Architecture Summary)

Kiến trúc của AI Tutor Overlay tập trung vào việc xử lý ngữ cảnh đa phương thức nhanh và bảo vệ trải nghiệm người dùng (UX) thông qua việc quản lý chặt chẽ logic và prompt.

- **Data Pipeline & Context Injection:** Backend (FastAPI) nhận yêu cầu và trích xuất ngữ cảnh tĩnh (Table of Contents) cũng như ngữ cảnh động (Transcript Window ±5 phút xung quanh timestamp hiện tại). Tất cả được đóng gói lại thành khối thông tin rành mạch trước khi đưa vào LLM.
- **LLM Service (`llm_service.py`):** Module cốt lõi tương tác với hệ thống. Nhận System Prompt cực kỳ nghiêm ngặt nhằm biến mô hình thông thường thành một Gia sư chuyên ngành. Xử lý Streaming Output và bóc tách siêu dữ liệu (Metadata: `confidence_score` & `source_citation`) ra khỏi text stream để Frontend phản hồi trực quan trên giao diện.
- **Product Canvas & Failure Modes Design:** Framework định hướng phát triển sản phẩm. Thay vì tập trung hoàn toàn vào kỹ thuật, dự án đi từ việc phân tích Pain Point (đứt gãy mạch tư duy), xác định Edge Cases (các tình huống AI sai nhầm, thiếu ngữ cảnh), để thiết kế luồng UI hiển thị cảnh báo tương ứng (Ví dụ: Banner vàng cho Low-confidence path).

---

## 2. Self Reflection 

### 2.1. Role và Đóng góp cụ thể
- **Vai trò**: Product Owner / Prompt Engineer & QA.
- **Đóng góp**: 
  - **Xây dựng AI Product Canvas và Pitching Slides:** Hoàn thiện bộ tài liệu định hướng sản phẩm dựa trên 3 tiêu chí: Value, Trust và Feasibility. Phân tích chi tiết tại sao bài toán này cần cơ chế "Augmentation" (Hỗ trợ người học quyết định) thay vì "Automation" (AI quyết định hộ).
  - **Thiết kế System Prompt cốt lõi:** Viết và tối ưu hóa System Prompt trong `llm_service.py` bằng các quy tắc kiểm soát chặt chẽ (Guardrails) như chống Prompt Injection, giới hạn Out of Scope, và ép LLM trả về metadata (`###META###`) với `confidence_score` và `source_citation` được chuẩn hóa.
  - **Test Edge Cases & Xử lý Failure Modes:** Trực tiếp đóng vai người dùng và "tấn công" (red-teaming) chatbot để dò tìm những lỗi sai ngầm (Silent Failures) như AI trả lời tự tin nhưng sai, AI bị mất ngữ cảnh, hoặc Gợi ý chủ động (Proactive) làm phiền người học. Từ đó thiết lập luồng UX dự phòng để người học có thể xem nguồn ngoài, hoặc báo sai cấu thành nên Data Flywheel.

### 2.2. SPEC phần mạnh nhất và yếu nhất? Vì sao?
- **Mạnh nhất**: Sự liên kết chặt chẽ giữa System Prompt và Trải nghiệm Người dùng (Trust). Bằng việc ép AI sinh ra `confidence_score` và trích dẫn chuẩn xác, hệ thống có cơ sở để hiện "Badge xanh" cho câu trả lời an toàn và "Banner vàng" cho câu trả lời rủi ro. Khống chế AI theo đúng Scope bài giảng giúp giảm rủi ro Hallucination đáng kể, biến một mô hình API bình thường thành một công cụ Edu đáng tin cậy.
- **Yếu nhất**: Việc test các Edge Cases tại thời điểm Hackathon chủ yếu vẫn dùng sức người (Manual Testing). Dự án thiếu một bộ câu hỏi đánh giá (Golden Dataset) chứa hàng chục Edge Cases tự động để test Regression mỗi khi thay đổi System Prompt hay Data chunking.

### 2.3. Điều học được trong Hackathon mà trước đó chưa biết
Em học được khái niệm "Trust" trong một sản phẩm GenAI quan trọng hơn rất nhiều so với "Accuracy". Ở phần mảng truyền thống, lỗi thì app crash, nhưng ở AI, nó có thể tự tin nói sai và khiến người dùng mất lòng tin mãi mãi (Silent failure). Em nhận ra việc suy nghĩ tới các "Failure Modes" từ đầu sẽ quy định luôn cách chúng ta thiết kế nút bấm trên UI (nút Báo sai, Report, Xem nguồn) và cấu trúc lại System Prompt thay vì tin tưởng phó mặc cho LLM.

### 2.4. Nếu làm lại, em sẽ thay đổi gì?
Nếu có thêm thời gian, em sẽ xây dựng một quy trình Automated Eval cho bộ phận QA. Cụ thể, tạo ra một danh sách khoảng 50 câu hỏi thử thách AI (câu hỏi lừa, câu hỏi sai chuyên môn, câu hỏi ngoài lề) và dùng LLM-as-a-Judge để tự động chấm điểm hiệu năng của chatbot thay vì phải gõ chat tay từng trường hợp.

### 2.5. AI giúp gì? AI sai/mislead ở đâu?
- **Giúp ích**: Cực kỳ hữu dụng trong việc brainstorm các kịch bản Edge Cases và mô phỏng các đòn Prompt Injection phức tạp. AI cũng hỗ trợ em sinh ra cấu trúc các outline trình bày Pitch/Poster siêu nhanh.
- **Fail / Mislead**: Khi viết System prompt, ban đầu AI gợi ý các prompt bay bổng như "hãy thân thiện", "hãy khuyến khích". Nhưng thực tế chứng minh prompt dài dòng không cấu trúc dễ làm Chatbot nói luyên thuyên. Đôi khi AI cũng khuyên dùng những phương pháp giới hạn quá phức tạp (như chạy mô hình kiểm duyệt riêng) làm mất tính Feasibility của dự án dưới áp lực Hackathon. Em đã phải tự chẩn đoán và giới hạn thành công bằng luật lệ cứng (`###META###`).
