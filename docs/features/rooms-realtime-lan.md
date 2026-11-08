# Room realtime và LAN

> **Mục đích:** Vòng đời phòng, realtime, kết nối và giới hạn LAN.
> **Đối tượng:** Lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../../apps/api/src/modules/rooms/rooms.service.ts).

Room lifecycle: `WAITING → READY → IN_PROGRESS → FINISHED`; Leave/grace expiry/TTL có thể chuyển `CANCELLED`. Ready chỉ khi đủ slot và tất cả đã Ready; Start chỉ host. Không sửa cấu hình lobby trong foundation; tạo phòng mới nếu muốn đổi.

Shared screen: host nhận hai slot server tạo, một identity điều khiển cả hai. Multi-device: mỗi identity một slot; cùng identity ở nhiều tab vẫn là cùng người chơi. Guest có room membership phía server, mã mời không cấp quyền gửi action thay slot khác.

Một principal chỉ ở một room còn sống. Rematch cần tất cả controller đồng ý, tạo session UUID mới và giữ nguyên lịch sử cũ. Leave đóng cả phòng V1, không chuyển host. Phòng không hoạt động hết hạn sau 15 phút; tối đa 128 phòng. Action, Start, Sync, Rematch, disconnect và timer cùng hàng xử lý theo room.

`PlatformProvider` trong layout `(main)` giữ một kết nối Socket.IO cho mỗi tab có phiên, đồng thời gọi `GET /api/rooms/current` để phát hiện phòng hiện tại theo controller membership trên server. `localStorage` chỉ giữ vai trò cache phụ. Khi có phòng đang mở (`WAITING`, `READY`, `IN_PROGRESS`, `FINISHED`), thanh thông báo phòng hiện tại xuất hiện trên các trang ngoài màn phòng đó; đóng thông báo chỉ ẩn tạm thời trong lần xem hiện tại mà không gọi `room:leave`. Khi trận đang `IN_PROGRESS`, mọi thao tác điều hướng nội bộ rời màn trận (`/play/[code]`) đều mở hộp thoại xác nhận nêu rõ rời phòng sẽ hủy trận cho cả hai người và không được thưởng, chỉ chuyển trang sau khi nhận ACK `room:leave`. Clipboard có fallback cho HTTP LAN vì Clipboard API yêu cầu secure context.

Reconnect policy **PROPOSAL**: đồng hồ tiếp tục, xin snapshot mới qua `room:sync`. Grace 30 giây từ socket cuối cùng của controller ngắt kết nối; quá grace hủy trận không thưởng. Một tab ngắt không làm slot offline nếu còn tab đã auth. API restart hủy session dang dở trong DB trước khi nhận client; room RAM không được khôi phục.

API và web bind `0.0.0.0`; client lấy `window.location` để xác định API host. CORS dùng allowlist `WEB_ORIGINS`, không mở `*`. CORS không thay thế auth. PostgreSQL chỉ bind loopback trên host qua Compose. Xem README để cấu hình IP/firewall.

Socket xác thực bằng cookie phiên và kiểm tra Origin. Phiên thu hồi bị ngắt kết nối qua quy trình disconnect hiện tại. Giới hạn payload 16 KB, 25 thao tác/giây/socket và REST JSON tối đa 1 MB. Luồng tài khoản nghiệm thu trên localhost, guest dùng được qua LAN tin cậy. Xem [đặc tả Auth](auth.md).

Socket.IO không mặc định đảm bảo nhận event mọi lần: ACK/actionId và full snapshot ở application layer là bắt buộc. [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/).
