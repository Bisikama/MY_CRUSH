# Hợp đồng giao tiếp

Nguồn chuẩn: `packages/shared-types/src/index.ts`. Socket namespace mặc định, path `/socket.io`; REST prefix `/api`. Kết nối socket dùng `{ auth: { token } }`; REST bảo vệ dùng `Authorization: Bearer <token>`.

REST Swagger UI: `/api/docs`; OpenAPI JSON: `/api/docs-json`. Tạo guest tại `POST /api/players/guest`, dán token vào **Authorize** (không thêm `Bearer`). UI mô tả request/response, status và lỗi cho 12 endpoint REST; các POST hiện trả 201. Health, danh sách shop và tạo guest là public; các REST còn lại yêu cầu guest token. Request schema dùng chung với runtime Zod; các ràng buộc `superRefine` của QuestionPack vẫn do server kiểm tra. Socket.IO không được thử qua Swagger.

ACK: `{ ok:true, data:T }` hoặc `{ ok:false, error:{code,message} }`. Error codes: INVALID_INPUT, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_LATE, RATE_LIMITED, INTERNAL. Không trả stack/database details cho browser.

| Client event | Payload / quyền                                       |
| ------------ | ----------------------------------------------------- |
| room:create  | mode, layout, packVersionId, secondNickname?          |
| room:join    | code; phòng còn chỗ và cho multi-device               |
| room:ready   | code; ready các slot của controller                   |
| match:start  | code; host và tất cả ready/connected                  |
| room:sync    | code; người đã thuộc room; trả full filtered snapshot |
| game:action  | code, sessionId, roundId, actionId, playerId, payload |
| room:rematch | code; controller bỏ phiếu; đủ phiếu tạo session mới   |
| room:leave   | code; hủy room, ACK null                              |

Action payload chỉ `BUZZ` hoặc `ANSWER { optionId }`. Server xác minh controller→slot trước lookup idempotency. Cùng actionId phải cùng player/round/payload, trả receipt version cũ. ActionId mới nhưng trả lời cùng câu bị từ chối. Không dùng expectedStateVersion để chặn câu trả lời đối thủ trong mode đồng thời; roundId/sessionId/deadline là điều kiện phù hợp.

Server hiện phát **room:state** chứa RoomView và filtered QuizView cho từng socket. Cả lobby/game/result đi trong snapshot này, client bỏ snapshot có game version thấp hơn cùng session. `game:state`/`match:result` giữ type cho adapter mở rộng nhưng chưa được emit; không viết client phụ thuộc các event đó. Nếu contract được đổi, cập nhật types/docs/tests cùng lúc.

REST: `POST /players/guest`, `GET /players/me`, `GET /players/me/history`, `GET /question-packs`, `POST /question-packs/preview`, `POST /question-packs`; `GET /shop/items`, `GET /shop/inventory`, `POST /shop/purchases {itemId,requestId}`, `POST /shop/equip {itemId}`; health/live và readiness.

Result snapshot không chứa grant amount: client đọc lại profile để thấy Coins/XP đã commit. History chỉ trả kết quả, không trả questionSnapshot bí mật. Browser timeout không chứng minh server chưa commit; purchase retry phải dùng cùng requestId, game action retry dùng cùng actionId hoặc Sync trước thao tác mới.
