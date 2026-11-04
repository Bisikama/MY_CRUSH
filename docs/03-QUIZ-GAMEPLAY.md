# Luật Quiz hiện thực trong foundation

Một engine, phân nhánh luật qua mode/layout. Mỗi câu: `QUESTION → REVEAL → câu tiếp theo / FINISHED`. Câu hiện tại có ID riêng trong session; deadline do server tạo. Browser chỉ hiển thị đếm ngược có bù clock offset gần đúng.

| Mode                 | Luật                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Solo                 | Một đáp án/câu, đúng cộng điểm tốc độ; xem giải thích sau lượt                                |
| Duel multi-device    | Cùng câu; hai bên trả lời riêng; reveal sau đủ hai đáp án hoặc hết giờ                        |
| Duel shared-screen   | A/L giành quyền, một người được trả lời; sai trừ điểm rồi cho người chưa thử giành quyền cướp |
| Co-op, cả hai layout | Đội trưởng luân phiên theo chỉ số câu; chỉ đội trưởng khóa đáp án; chung điểm/mạng            |

Thông số **PROPOSAL** nằm trong `DEFAULT_QUIZ_RULES`: đúng `round(100 + 50 * remaining/total)`, sai Shared Duel -20, cướp đúng +75, reveal 2500ms, Co-op 3 mạng/4 câu mỗi ải. Solo/Duel chọn tối đa 10 câu, Co-op tối đa 20; pack ít câu được rút ngắn số ải. Không tự lặp câu để đủ 20. Mỗi ải foundation là nhóm câu; chưa có mục tiêu riêng từng ải.

`now >= deadline`: từ chối answer. Timer quá hạn vẫn đóng câu khi xử lý trễ; không lấy clock client. Co-op sai hoặc hết giờ mất một mạng; hết mạng kết thúc sau reveal. Duel hòa được ghi `DRAW`. Solo 0 điểm vẫn là hoàn thành, reward policy được giới hạn riêng.

Buzzer chỉ chấp nhận một người tại một thời điểm. Người trả lời sai không được thử lại câu đó. Timeout buzzer không cộng/trừ thêm điểm. Giữ phím bị bỏ qua ở UI; server vẫn kiểm tra thao tác lặp. Mobile có nút giành quyền tương đương phím.

Không gửi `correctOptionId`, explanation, hints, các câu tương lai hoặc answers của đối thủ trong QUESTION. Shared screen có quyền xem input của cả hai slot vì cùng một browser; không bảo đảm bí mật giữa hai người trên một màn hình.

Hint/50-50/extra-time và UI ôn riêng chưa có; không dùng cosmetic API như power-up. Không hứa khả năng chơi offline: Solo vẫn cần backend và PostgreSQL.
