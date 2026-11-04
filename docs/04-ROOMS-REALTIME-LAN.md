# Room realtime và LAN

Room lifecycle: `WAITING → READY → IN_PROGRESS → FINISHED`; Leave/grace expiry/TTL có thể chuyển `CANCELLED`. Ready chỉ khi đủ slot và tất cả đã Ready; Start chỉ host. Không sửa cấu hình lobby trong foundation; tạo phòng mới nếu muốn đổi.

Shared screen: host nhận hai slot server tạo, một identity điều khiển cả hai. Multi-device: mỗi identity một slot; cùng identity ở nhiều tab vẫn là cùng người chơi. Guest có room membership phía server, mã mời không cấp quyền gửi action thay slot khác.

Một principal chỉ ở một room còn sống. Rematch cần tất cả controller đồng ý, tạo session UUID mới và giữ nguyên lịch sử cũ. Leave đóng cả phòng V1, không chuyển host. Phòng không hoạt động hết hạn sau 15 phút; tối đa 128 phòng. Action, Start, Sync, Rematch, disconnect và timer cùng hàng xử lý theo room.

Browser lưu mã phòng theo guest identity để trang Home có thể đồng bộ và đưa người chơi quay lại/rời phòng sau khi xem profile hoặc reload. Con trỏ local này không cấp quyền, phải được server xác nhận. Clipboard có fallback cho HTTP LAN vì Clipboard API yêu cầu secure context.

Reconnect policy **PROPOSAL**: đồng hồ tiếp tục, xin snapshot mới qua `room:sync`. Grace 30 giây từ socket cuối cùng của controller ngắt kết nối; quá grace hủy trận không thưởng. Một tab ngắt không làm slot offline nếu còn tab đã auth. API restart hủy session dang dở trong DB trước khi nhận client; room RAM không được khôi phục.

API và web bind `0.0.0.0`; client lấy `window.location` để xác định API host. CORS dùng allowlist `WEB_ORIGINS`, không mở `*`. CORS không thay thế auth. PostgreSQL chỉ bind loopback trên host qua Compose. Xem README để cấu hình IP/firewall.

Socket giới hạn payload 16KB, 25 thao tác/giây/socket. REST JSON tối đa 1MB. Đây chưa là hệ thống chống abuse Internet; guest creation chưa có chống bot, token chưa có rotation/expiry. Không expose bản nền tảng ra mạng công cộng.

Socket.IO không mặc định đảm bảo nhận event mọi lần: ACK/actionId và full snapshot ở application layer là bắt buộc. [Delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/).
