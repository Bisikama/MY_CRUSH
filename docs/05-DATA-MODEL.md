# Dữ liệu và transaction

Một PostgreSQL, một `prisma/schema.prisma`, một migration stream. Migration đầu tiên bao gồm CHECK constraints cho balance/quantity/price không âm.

| Domain   | Models                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Identity | Player: nickname, tokenHash duy nhất, XP                                                                  |
| Content  | QuizQuestionPack: packId + version duy nhất, owner, trusted, JSON content                                 |
| Session  | GameSession: mode/layout, status, pack version, questionSnapshot                                          |
| Result   | SessionPlayer composite key; MatchResult duy nhất/session; QuizPlayerAnswer duy nhất/session/round/player |
| Economy  | Wallet một/player; CoinTransaction idempotencyKey duy nhất; ItemDefinition; Inventory; Loadout            |

QuestionPack lưu JSON validated thay vì tách bảng từng Question trong foundation. Session snapshot giữ đúng câu hỏi/đáp án theo lúc Start; sửa pack tạo version mới. Pack tự nhập chỉ chủ sở hữu được xem/chọn ở library; người được mời vẫn chơi được session do host tạo mà không được đọc nguyên pack.

Room/RoomParticipant sống trong RAM, không tạo bảng rỗng chỉ cho đủ tên blueprint. Khi cần room bền vững, thêm migration và sửa restart policy. Snapshot câu hỏi là bí mật server, không trả từ API history.

Kết toán: conditional claim `IN_PROGRESS → FINISHED`, tạo MatchResult, cập nhật scores, ledger, Wallet và XP trong **một serializable transaction**. Retry có giới hạn khi Prisma P2034. Không emit FINISHED trước commit; nếu DB lỗi, giữ REVEAL và timer thử lại. Result đã commit có thể đọc qua history dù API restart trước broadcast.

Purchase: idempotency key ràng buộc player/request/item, conditional balance decrement, inventory và ledger cùng transaction. CHECK constraints là lớp phòng vệ bổ sung. Equip xác minh sở hữu và slot, unique(playerId,slot). Không giữ transaction mở để gọi mạng hay phát socket.

Action receipt hiện ở RAM theo session. Sau restart trận bị hủy; không có cam kết replay action qua restart. Câu trả lời accepted ghi DB trước khi cập nhật live state. Đây không phải event sourcing hoặc phục hồi mọi frame.
