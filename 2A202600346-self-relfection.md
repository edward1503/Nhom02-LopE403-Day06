# Self Reflection

**Họ và tên:** Vũ Quang Phúc

**Mã học viên:** 2A202600346  

**Lớp:** E403  

## Nhìn lại những gì em đã học

Điều em thấy rõ nhất sau các buổi lab và hackathon là làm sản phẩm AI không chỉ là gọi model ra câu trả lời. Ở Lab 4, em học cách xây dựng một agent có tools, biết chia bài toán thành từng chức năng cụ thể như tìm chuyến bay, tìm khách sạn và tính ngân sách. Từ đó em hiểu rằng AI muốn hữu ích thì phải có luồng xử lý rõ ràng, có ràng buộc và có phạm vi nhiệm vụ cụ thể, chứ không thể chỉ "chat chung chung".

Sang Lab 5, em học được một góc nhìn khác quan trọng hơn: AI luôn có xác suất sai, nên thiết kế sản phẩm phải tính cả lúc AI đúng, lúc AI không chắc và lúc AI trả lời sai. Trước đây em thường nghĩ chỉ cần làm cho model trả lời tốt hơn là đủ, nhưng sau buổi này em hiểu UX, eval metrics và failure modes mới là phần quyết định người dùng có tiếp tục tin sản phẩm hay không. Bài học này ảnh hưởng rất nhiều đến cách em tham gia hackathon ở Day 6.

Trong hackathon, em học cách nối tư duy kỹ thuật với tư duy sản phẩm. Nhóm em làm **AI Tutor Overlay** cho bối cảnh học online, và em nhận ra một giải pháp AI tốt phải trả lời đúng nhu cầu rất cụ thể: giúp người học không bị mất mạch suy nghĩ khi phải rời bài giảng để đi tìm giải thích ở nơi khác. Từ đó em hiểu thêm khái niệm **augmentation**: AI không thay người học quyết định, mà đóng vai trò hỗ trợ đúng lúc, đúng ngữ cảnh và đủ tin cậy.

## Phần em phụ trách và đóng góp

Vai trò chính của em trong nhóm là phát triển phần **User Stories theo 4 paths** và hỗ trợ trình bày demo flow. Em tập trung mô tả rõ từng tình huống cho sản phẩm: khi AI trả lời đúng, khi AI không chắc, khi AI sai và khi người dùng cần sửa hoặc bắt đầu lại. Việc này giúp nhóm không chỉ nghĩ tới happy path mà còn chuẩn bị trước cho các tình huống dễ làm người dùng mất niềm tin.

Ngoài ra, em cũng đóng góp vào việc làm rõ trải nghiệm sử dụng của AI Tutor Overlay: sinh viên hỏi ngay trên slide đang xem, nhận câu trả lời gắn với nguồn tham khảo, có thể bấm "Đã hiểu", "Hỏi tiếp" hoặc "Báo sai". Em học được rằng một flow tưởng như đơn giản thực ra cần được thiết kế rất chặt, vì chỉ cần thiếu một bước recover khi AI sai thì toàn bộ trải nghiệm sẽ trở nên thiếu an toàn.

## Phần em thấy nhóm làm tốt nhất

Phần mạnh nhất theo em là tư duy **đặt trust lên trước**. Nhóm không chạy theo việc làm AI trả lời thật nhiều, mà ưu tiên precision, nguồn tham khảo, cảnh báo khi thiếu ngữ cảnh và cơ chế feedback như "Báo sai". Em thấy đây là điểm mạnh vì trong giáo dục, trả lời sai nhưng nghe có vẻ hợp lý là rủi ro lớn nhất.

Em cũng thấy nhóm làm tốt ở chỗ biến ý tưởng thành một prototype có thể demo được. Từ một bài toán khá rộng, nhóm đã thu hẹp còn một flow rõ ràng với slide PDF, overlay hỏi đáp và AI call thật. Điều này giúp sản phẩm đủ cụ thể để kiểm chứng thay vì chỉ dừng ở ý tưởng.

## Phần em thấy còn yếu và nếu làm lại em sẽ cải thiện gì

Điểm em thấy còn yếu là prototype hiện tại mới tập trung tốt vào ngữ cảnh slide, còn phần video transcript, correction log lâu dài và proactive suggestion vẫn mới ở mức ý tưởng hoặc mô phỏng. Điều đó nghĩa là giá trị sản phẩm đã nhìn thấy, nhưng vòng lặp học hỏi từ dữ liệu người dùng vẫn chưa thật sự hoàn chỉnh.

Nếu có thêm thời gian, em muốn làm lại theo hướng sâu hơn ở hai phần. Thứ nhất là xây correction log thành một pipeline rõ ràng để những lần người dùng báo sai không chỉ được lưu lại mà còn thực sự giúp cải thiện prompt hoặc context retrieval. Thứ hai là kiểm thử kỹ hơn với nhiều loại tài liệu học khác nhau để xem khi nào AI nên trả lời, khi nào nên từ chối, và khi nào nên chỉ gợi ý xem lại nguồn gốc.

## Điều em rút ra cho bản thân

Sau bài này, em học được rằng làm AI product cần sự cân bằng giữa tốc độ làm prototype và khả năng tự đặt câu hỏi phản biện với chính sản phẩm của mình. Em không còn nhìn AI như một "cục thông minh" chỉ cần nối API là xong, mà là một hệ thống phải được thiết kế cả về dữ liệu, ngữ cảnh, độ tin cậy và trải nghiệm sửa sai.

Bài học quan trọng nhất với em là: một sản phẩm AI tốt không phải sản phẩm trả lời nhiều nhất, mà là sản phẩm giúp người dùng cảm thấy an tâm khi sử dụng. Từ Lab 4 đến Day 6, em thấy mình tiến bộ ở cách nghĩ có cấu trúc hơn, biết nhìn bài toán từ góc độ người dùng hơn, và hiểu rõ hơn vì sao failure modes cùng feedback loop lại là phần không thể thiếu khi xây dựng sản phẩm AI thật.
