# Hợp đồng giao tiếp

> **Mục đích:** Hợp đồng REST và Socket.IO hiện tại.
> **Đối tượng:** Lập trình viên frontend/backend và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-11.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../packages/shared-types/src/index.ts).

Nguồn chuẩn: `packages/shared-types/src/index.ts`. Socket namespace mặc định, path `/socket.io`; REST prefix `/api`. REST và Socket.IO xác thực qua cookie phiên dq_session. Request REST ghi dữ liệu cần Origin hợp lệ và X-CSRF-Token lấy từ GET /api/auth/csrf.

REST Swagger UI ở /api/docs, OpenAPI JSON ở /api/docs-json. Tạo guest hoặc đăng nhập để browser nhận cookie. Swagger tự lấy CSRF token cho request ghi. Xem [đặc tả Auth và phân quyền](../features/auth.md).

ACK: `{ ok:true, data:T }` hoặc `{ ok:false, error:{code,message} }`. Error codes: INVALID_INPUT, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_LATE, RATE_LIMITED, INTERNAL. Không trả stack/database details cho browser.

| Client event | Payload / quyền                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| room:create  | mode, layout, selection, secondNickname?; tương thích packVersionId/filter cũ |
| room:join    | code; phòng còn chỗ và cho multi-device                                       |
| room:ready   | code; ready các slot của controller                                           |
| match:start  | code; host và tất cả ready/connected                                          |
| room:sync    | code; người đã thuộc room; trả full filtered snapshot                         |
| game:action  | code, sessionId, roundId, actionId, playerId, payload                         |
| room:rematch | code; controller bỏ phiếu; đủ phiếu tạo session mới                           |
| room:leave   | code; hủy room, ACK null                                                      |

Action payload là `BUZZ`, `ANSWER { optionId }` hoặc `USE_SKILL { skill }`. Server xác minh controller→slot trước lookup idempotency. Cùng actionId phải cùng player/round/payload, trả receipt version cũ. ActionId mới nhưng trả lời cùng câu bị từ chối. Không dùng expectedStateVersion để chặn câu trả lời đối thủ trong mode đồng thời; roundId/sessionId/deadline là điều kiện phù hợp.

Server hiện phát **room:state** chứa RoomView và filtered QuizView cho từng socket. Cả lobby/game/result đi trong snapshot này, client bỏ snapshot có game version thấp hơn cùng session. `game:state`/`match:result` giữ type cho adapter mở rộng nhưng chưa được emit; không viết client phụ thuộc các event đó. Nếu contract được đổi, cập nhật types/docs/tests cùng lúc.

REST: `POST /players/guest`, `GET /players/me`, `GET /players/me/history`, `GET /rooms/current`, `GET /question-packs`, `POST /question-packs/preview`, `POST /question-packs`; `GET /shop/items`, `GET /shop/inventory`, `POST /shop/purchases {itemId,requestId}`, `POST /shop/equip {itemId}`; health/live và readiness.

`GET /api/rooms/current` dùng `@AllowGuest()`, xác định người chơi từ cookie phiên (bỏ qua mọi `playerId` từ query), trả `{ room: null | { code, gameId: 'quiz', status } }` với `status` thuộc `WAITING | READY | IN_PROGRESS | FINISHED` và `Cache-Control: no-store`. Endpoint chỉ đọc qua hàng xử lý membership/room, không join phòng, không cập nhật presence và không gia hạn idle TTL. Các thao tác `POST /api/auth/register/complete`, `POST /api/auth/login`, `POST /api/auth/logout` và `POST /api/auth/logout-all` trả `409 CONFLICT` nếu người chơi còn phòng đang mở.

Result snapshot không chứa grant amount: client đọc lại profile để thấy Coins/XP đã commit. History chỉ trả kết quả, không trả questionSnapshot bí mật. Browser timeout không chứng minh server chưa commit; purchase retry phải dùng cùng requestId, game action retry dùng cùng actionId hoặc Sync trước thao tác mới.

Các endpoint bộ đề nhận hoặc trả `knowledgeType` tùy chọn theo payload bộ đề, bản xem trước hoặc tóm tắt. Giá trị là `academic`, `practical` hoặc `discovery`. Bộ cũ có thể thiếu trường. Sảnh dùng nhóm để lọc danh sách trước khi chọn ID phiên bản gửi cho `room:create`.

`filter` nhận `category`, `topic`, `difficulty` tùy chọn. `RoomView.setup` mô tả cấu hình và số câu thực tế. `QuizView` gửi lượt Skill cho slot client điều khiển, hint đã mở và lựa chọn bị ẩn cho người hoặc đội áp dụng. Hiệu ứng đối kháng chỉ có trong view của mục tiêu, với mốc `until` theo giờ server. REST tóm tắt pack bổ sung lĩnh vực, nhóm số câu theo đề tài/độ khó và kiến thức bổ sung.

`selection` có ba dạng strict. `{type:'CASUAL_RANDOM'}` không nhận filter. `{type:'CASUAL_CUSTOM', categories:string[], topics:{category,topic}[], difficulty:'easy'|'medium'|'hard'|'mixed'}` nhận tối đa 50 mục mỗi danh sách, mảng rỗng tương đương tất cả. `{type:'STUDY', packVersionId, filter?}` chọn một phiên bản pack. Payload cũ được diễn giải thành STUDY. Gửi đồng thời selection và packVersionId/filter ngoài selection bị từ chối.

`GET /api/question-packs/casual-catalog` cho guest/account đã xác thực, trả mảng `{category,topic,difficulty,count}` từ nguồn đố vui đã duyệt và phiên bản mới nhất. Response không chứa prompt/đáp án. Count mô tả kho, số câu sau lịch sử do server quyết định khi tạo phòng.

`RoomView.setup.selection` bổ sung cấu hình lựa chọn, cùng title/category/filter/questionCount. Câu tương lai, nguồn câu, khóa lịch sử và tập mở vòng chỉ ở server. Tái đấu bốc đề mới theo cùng lựa chọn. Hoàn thành hoặc hủy phải commit batch lịch sử trước khi cho mở ván tiếp theo.

QuestionPack v1 hỗ trợ `questions[].images` tùy chọn với tối đa bốn object `{src, alt}`. Preview và Save kiểm tra origin CDN theo `QUIZ_IMAGE_CDN_ORIGINS`. `room:state.game.question.images` chứa tham chiếu ảnh của câu hiện tại nếu có. Trình duyệt tải file trực tiếp từ web hoặc CDN. [Quy tắc nguồn ảnh](../features/question-packs.md#câu-hỏi-có-ảnh)
