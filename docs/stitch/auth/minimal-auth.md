# Auth tối giản — brief Stitch

> **Mục đích:** Brief auth tối giản, screen ID và bằng chứng kiểm tra Stitch.
> **Đối tượng:** Người thiết kế và lập trình viên frontend.
> **Trạng thái:** `draft`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../../README.md), [Nguồn tham khảo](../../features/auth.md).

Theo yêu cầu mới: ít chữ, nhập đơn giản, ưu tiên minh họa và hoạt họa. Chỉ thiết kế/prototype; không thay đổi API hay luật sản phẩm.

DuoQuest auth mới: ÍT CHỮ, NHIỀU HÌNH ẢNH, form đơn giản. Tạo MỘT màn hình mới, không sửa màn đăng ký đã có.
Tham khảo màu sắc, độ bo, font và tính cách từ màn đăng ký a102c40f05d74455abb949b445a04602 và OTP 4c9f7bd1e42c45ada93421fbf51d7f29 trong project này, nhưng giảm mạnh chữ và bỏ các card marketing. Dùng Pastel Playfield. Nền kem lavender #FEF7FF, tím #7E57C2/#653DA7, xanh trời #4FC3F7, đào #FF8A65, vàng bơ; chữ tím than #2D2638. Quicksand heading, Nunito Sans body. Không đổi sang serif.
Desktop 1440x960: MỘT khung chung ở giữa, HAI CỘT nằm NGANG 52/48, max-width 1180px. Trái là một minh họa LỚN thỏ tím + chim xanh bằng đất sét mềm 3D trên nền gradient pastel, không chứa ảnh chụp giao diện, không chữ nhúng trong ảnh; chỉ logo DuoQuest và tối đa một câu 4–6 từ. Phải là card trắng, form gọn 400px, không header menu hay footer dài, không chip thống kê, không list lợi ích, không chia form thành dashboard.
Mọi chữ giao diện tiếng Việt, tiêu đề tối đa 5 từ, mô tả tối đa một câu ngắn khi cần, một CTA chính tím nổi đáy, link phụ gọn. Label ngắn luôn nhìn thấy. Input cao 52–56px, bo 16px, focus rõ. Không để hình ảnh thay thế label/error/các thông tin cần thiết.
Nếu HTML prototype được tạo, làm animation thực: button squish 2px/120ms, mascot thở/floating rất nhẹ, khi hover vẫy tai/cánh, chuyển bước fade+slide 12px/240ms, trạng thái loading spinner trong nút, success sparkle một lần. CSS prefers-reduced-motion tắt chuyển động trang trí, giữ trạng thái tĩnh. Không animation liên tục quanh ô nhập. Hiện/ẩn password, nhập/paste OTP và keyboard dùng được. Mobile <=640px một cột: minh họa rút nhỏ, form lên trước, không overflow, input >=16px, tap target >=44px.
Chức năng bám source DuoQuest: tài khoản cá nhân bằng email/password, không OAuth, không referral, thưởng tân thủ, chọn linh vật ảnh hưởng XP, rank, ghép đôi account, community, QR/random match. Không online count, ping, server region giả, không lời hứa quà; linh vật chỉ là hình ảnh. Prototype không giả vờ auth thật và không dùng alert() báo thành công.
Tạo đúng MỘT artboard theo yêu cầu sau, không hỏi chọn nhóm nào, không tạo thêm màn đăng ký.

Luồng: Đăng nhập → Quên mật khẩu (email) → OTP → Mật khẩu mới → Thành công → Đăng nhập.
Trạng thái kèm theo: lỗi thông tin đăng nhập, loading, xác nhận chuyển guest, yêu cầu rời phòng, sai/hết hạn OTP, gửi lại có cooldown, phiên hết hạn, lỗi mạng, mật khẩu không khớp.

## Kết quả trên Stitch

Project: https://stitch.withgoogle.com/projects/9329491706796553468

Các screen resource cuối cùng cần review. Lần kiểm tra ngày 2026-11-07 khi sắp xếp tài liệu đã xác nhận cả năm màn xuất hiện trên canvas; lịch sử kiểm tra trước đó được giữ bên dưới.

| Màn                                     | Screen ID                        |
| --------------------------------------- | -------------------------------- |
| Auth Mini — 01 Đăng nhập (Polished)     | e71c331ea7d540dba530d0f04744b70b |
| Auth Mini — 02 Quên mật khẩu (Polished) | 54e4bb1f7d6646af934cec0cdffca4f8 |
| Auth Mini — 03 Mã xác minh              | 65374f0404124119af1a337c801a72a0 |
| Auth Mini — 04 Mật khẩu mới (Polished)  | 6edae88c374b411b97be5d26081e0dfd |
| Auth Mini — 05 Đổi mật khẩu xong        | bbd907a9fe4d4bf6ba07b2881f092587 |

Đã xem screenshot desktop và đọc HTML của cả năm màn. HTML có CSS animation và prefers-reduced-motion. Chưa kiểm thử tương tác bằng trình duyệt, mobile hoặc tích hợp backend. Các hash link trong prototype không chứng minh đã có navigation liên màn thật. Animation hình minh họa dùng chuyển động toàn khung, chưa phải rig/sprite chuyển động riêng tai/cánh linh vật.

Không sửa các màn đăng ký người dùng đã có.

## Lịch sử kiểm tra việc hiển thị trên canvas

**Ghi nhận trước, ngày 2026-11-07:** Sau khi người dùng báo không thấy thay đổi, đọc lại get_project và list_screens: cả năm màn Auth Mini không có trong screenInstances và không có trong list_screens. Tuy nhiên get_screen theo từng ID vẫn trả về ảnh/HTML. Tại thời điểm đó generation đã tạo screen resources nhưng chưa thấy trên canvas của project. Báo hoàn tất hiển thị trước đó là chưa chính xác. Bộ MCP khi kiểm tra không có tool cập nhật screenInstances hoặc thêm screen có sẵn lên canvas; chưa xác định nguyên nhân. Không nên quy lỗi cache hoặc cấu hình xác thực khi chưa có bằng chứng.

**Kiểm tra sau, ngày 2026-11-07 khi tổ chức tài liệu:** Gọi lại `get_project` cho project `9329491706796553468`. Cả năm screen ID trong bảng đều có trong `screenInstances` và không bị đánh dấu `hidden`. Project trả `updateTime` là `2026-11-07T15:02:49.142139Z`; đây là thời điểm cập nhật project do Stitch trả về, không phải thời điểm kiểm thử giao diện. Xác nhận này chỉ chứng minh các màn đã có trên canvas; chưa chứng minh prototype liên màn, mobile, tương tác hay tích hợp backend đã hoạt động. Chưa xác định nguyên nhân của khác biệt với lần đọc trước.
