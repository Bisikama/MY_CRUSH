# Luật Quiz hiện thực trong foundation

> **Mục đích:** Luật Quiz theo mode và cách chơi.
> **Đối tượng:** Lập trình viên, thiết kế game và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../packages/game-quiz/src/quiz.engine.ts).

Một engine, phân nhánh luật qua mode/layout. Mỗi câu: `QUESTION → REVEAL → câu tiếp theo / FINISHED`. Câu hiện tại có ID riêng trong session; deadline do server tạo. Browser chỉ hiển thị đếm ngược có bù clock offset gần đúng.

| Mode                 | Luật                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Solo                 | Một đáp án/câu, đúng cộng điểm tốc độ; xem giải thích sau lượt                                |
| Duel multi-device    | Cùng câu; hai bên trả lời riêng; reveal sau đủ hai đáp án hoặc hết giờ                        |
| Duel shared-screen   | A/L giành quyền, một người được trả lời; sai trừ điểm rồi cho người chưa thử giành quyền cướp |
| Co-op, cả hai layout | Đội trưởng luân phiên theo chỉ số câu; chỉ đội trưởng khóa đáp án; chung điểm/mạng            |

Thông số **PROPOSAL** nằm trong `DEFAULT_QUIZ_RULES`: đúng `round(100 + 50 * remaining/total)`, sai Shared Duel -20, cướp đúng +75, reveal 2500ms, Co-op 3 mạng/4 câu mỗi ải. Câu đúng có bonus độ khó Dễ +0, Trung bình +15, Khó +30, kể cả câu cướp đúng. Học luyện chọn tối đa 10 câu Solo/Duel hoặc 20 câu Co-op; Đố vui chọn tối đa 20 câu ở cả ba mode. Bộ đề ít câu rút ngắn số ải. Mỗi ải foundation là nhóm câu; chưa có mục tiêu riêng từng ải.

Cả hai trải nghiệm dùng chung engine. Bước chuẩn bị đề thuộc backend Question Packs, chốt trước khi tạo phòng. Học luyện bốc lại từ pack được chọn. Đố vui tránh lặp theo host, ghi lịch sử hàng loạt khi hoàn thành hoặc hủy ván, gồm cả câu hiện tại và loại các câu chưa tới lượt. Co-op hết mạng có thể kết thúc trước khi chơi hết đề. Xem [quy tắc nguồn và chọn câu](question-packs.md).

`now >= deadline`: từ chối answer. Timer quá hạn vẫn đóng câu khi xử lý trễ; không lấy clock client. Co-op sai hoặc hết giờ mất một mạng; hết mạng kết thúc sau reveal. Duel hòa được ghi `DRAW`. Solo 0 điểm vẫn là hoàn thành, reward policy được giới hạn riêng.

Buzzer chỉ chấp nhận một người tại một thời điểm. Người trả lời sai không được thử lại câu đó. Timeout buzzer không cộng/trừ thêm điểm. Giữ phím bị bỏ qua ở UI; server vẫn kiểm tra thao tác lặp. Mobile có nút giành quyền tương đương phím.

Trong QUESTION chỉ gửi hint đã mở cho đúng người hoặc đội. Đáp án đúng, lời giải, hint chưa mở, câu tương lai và đáp án đối thủ được giữ phía server. Shared screen có quyền xem input của cả hai slot vì cùng một browser; không bảo đảm bí mật giữa hai người trên một màn hình.

Extra-time và UI ôn riêng chưa có. Không hứa khả năng chơi offline: Solo vẫn cần backend và PostgreSQL.

Câu hỏi có thể hiển thị tối đa bốn ảnh. Skill Che câu hỏi tạm ẩn ảnh cùng đề bài trên màn hình của người bị tác động. [Soạn câu hỏi có ảnh](question-packs.md#câu-hỏi-có-ảnh)

## Skill

Solo và Duel chung màn hình có Hint và 50/50. Duel LAN có thêm Che câu hỏi 2 giây và Làm mờ đáp án 3 giây. Solo/Duel cấp một lượt miễn phí mỗi loại mỗi slot mỗi trận và dùng trước lượt kho. Mỗi người dùng tối đa 7 lượt tổng. Co-op chỉ có hai Skill hỗ trợ và dùng từ kho ngay, tối đa 3 lượt mỗi người. Cả hai có thể mở gợi ý hoặc ẩn đáp án cho đội, còn đội trưởng nộp đáp án. Duel chung màn hình chỉ slot giữ buzzer được dùng.

Skill chỉ dùng trong QUESTION. Hint mở lần lượt. 50/50 ẩn hai lựa chọn sai tối đa một lần mỗi câu cho người hoặc đội. Hai Skill hỗ trợ đóng trong 3 giây cuối. Đối kháng bắt đầu sau 5 giây đầu, yêu cầu còn đủ thời gian hiệu ứng và đối thủ chưa trả lời. Mỗi loại đối kháng dùng một lần mỗi người mỗi câu và không chồng hiệu ứng lên cùng mục tiêu. Hai hiệu ứng thay đổi hiển thị, người bị tác động vẫn nộp được đáp án và timer tiếp tục chạy.
