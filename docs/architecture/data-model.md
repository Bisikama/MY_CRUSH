# Dữ liệu và transaction

> **Mục đích:** Mô hình dữ liệu và nguyên tắc transaction.
> **Đối tượng:** Lập trình viên backend.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../prisma/schema.prisma).

Một PostgreSQL, một `prisma/schema.prisma`, một migration stream. Migration đầu tiên bao gồm CHECK constraints cho balance/quantity/price không âm.

| Domain   | Models                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Identity | Player: nickname, tokenHash duy nhất, XP                                                                  |
| Content  | QuizQuestionPack: packId + version duy nhất, owner, trusted, JSON content                                 |
| Session  | GameSession: mode/layout, status, pack version tùy chọn, questionSnapshot, selectionSnapshot              |
| History  | QuizQuestionHistory: hostPlayerId + questionKey, askedAt                                                  |
| Result   | SessionPlayer composite key; MatchResult duy nhất/session; QuizPlayerAnswer duy nhất/session/round/player |
| Economy  | Wallet một/player; CoinTransaction idempotencyKey duy nhất; ItemDefinition; Inventory; Loadout            |

QuestionPack lưu JSON validated thay vì tách bảng từng Question trong foundation. Session snapshot giữ đúng câu hỏi/đáp án theo lúc Start; sửa pack tạo version mới. Pack tự nhập chỉ chủ sở hữu được xem/chọn ở library; người được mời vẫn chơi được session do host tạo mà không được đọc nguyên pack.

Room/RoomParticipant sống trong RAM, không tạo bảng rỗng chỉ cho đủ tên blueprint. Khi cần room bền vững, thêm migration và sửa restart policy. Snapshot câu hỏi là bí mật server, không trả từ API history.

Với câu có ảnh, JSON của pack và snapshot lưu tối đa bốn cặp `src` và `alt`. File ảnh được phục vụ từ web hoặc CDN. URL có phiên bản giúp snapshot trỏ đến đúng nội dung khi ảnh được cập nhật. [Quy tắc lưu ảnh](../features/question-packs.md#dung-lượng-và-lưu-trữ)

Migration `20261111000000_quiz_selection_history` cho `GameSession.packVersionId` nhận null với đề nhiều nguồn và thêm `selectionSnapshot` JSON tùy chọn. Metadata này giữ loại chọn đề, host, điều kiện thưởng, nguồn từng câu theo thứ tự snapshot, khóa lịch sử và tập khóa cần mở vòng mới. Ván cũ giữ packVersionId và snapshot hiện có.

`QuizQuestionHistory` có khóa chính `(hostPlayerId, questionKey)`, `askedAt` và FK tới Player với cascade delete. Các dòng hiện tại biểu thị câu đã hỏi trong vòng của host. Batch khi kết thúc/hủy thực hiện cùng transaction claim trạng thái session. Khi mở vòng, chỉ xóa các khóa thuộc tập đã chốt lúc chuẩn bị đề, rồi thêm các câu đã tới lượt. Retry không claim được session thì không sửa lịch sử. Học luyện không ghi bảng này.

Kết toán: conditional claim `IN_PROGRESS → FINISHED`, tạo MatchResult, cập nhật scores, ledger, Wallet và XP trong **một serializable transaction**. Retry có giới hạn khi Prisma P2034. Không emit FINISHED trước commit; nếu DB lỗi, giữ REVEAL và timer thử lại. Result đã commit có thể đọc qua history dù API restart trước broadcast.

Purchase: idempotency key ràng buộc player/request/item, conditional balance decrement, inventory và ledger cùng transaction. CHECK constraints là lớp phòng vệ bổ sung. Equip xác minh sở hữu và slot, unique(playerId,slot). Không giữ transaction mở để gọi mạng hay phát socket.

Action receipt hiện ở RAM theo session. Sau restart trận bị hủy; không có cam kết replay action qua restart. Câu trả lời accepted ghi DB trước khi cập nhật live state. Đây không phải event sourcing hoặc phục hồi mọi frame.

Skill dùng lại `ItemDefinition` và `Inventory.quantity`. `QuizSkillUse` lưu biên nhận theo session/action cùng transaction trừ lượt kho. Lượt miễn phí, hiệu ứng đang chạy và bộ lọc phòng nằm trong live state. Snapshot câu hỏi lưu tập câu đã lọc.
