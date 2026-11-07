# Prompt thiết kế Auth V1 trên Stitch

> **Mục đích:** Brief thiết kế auth ban đầu; tham khảo lịch sử trước bản tối giản.
> **Đối tượng:** Người thiết kế và agent sử dụng Stitch.
> **Trạng thái:** `historical`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../../README.md), [Nguồn tham khảo](minimal-auth.md).

Đây là brief thiết kế/prototype; không thay đổi API, schema hay quyết định sản phẩm đã ghi nhận.

Thiết kế bổ sung bộ màn hình Auth V1 cho DuoQuest trong chính dự án DuoQuest Cozy Game Lobby. Tạo các màn hình MỚI, giữ nguyên các màn cũ để so sánh. Tái sử dụng design system Pastel Playfield assets/5ec9ef8fabdd43a58b9ba2c5bb4950c7 và tham khảo trực tiếp các màn auth a918c4c8f54e4ac8a139e33cba5eb520, b38483c31f86411fa6881ca25b43d3e7, fb7eeb05596d4e10af9fe7962bb03634.

MỤC TIÊU
Một bộ auth tiếng Việt hoàn chỉnh, vui tươi và có tương tác hoạt họa tinh tế, đồng nhất với phong cách hiện tại. Đây là thiết kế/prototype, không phải backend auth thật. Mỗi tài khoản thuộc một người chơi. DuoQuest V1 có Quiz Battle với Solo, Duel, Co-op, chơi chung màn hình hoặc hai client LAN.

HÌNH ẢNH VÀ BỐ CỤC
Giữ tinh thần soft claymorphism: nền kem pha lavender rất nhẹ, thẻ trắng phồng mềm, bóng tím tản nhẹ, sticker nghiêng 2–3 độ, minh họa thỏ tím và chim xanh bằng đất sét 3D. Linh vật là minh họa thương hiệu, không phải chức năng chọn avatar tài khoản.
Màu chính #7E57C2, tím đậm #653DA7 cho CTA chữ trắng, xanh #4FC3F7, đào #FF8A65, vàng bơ #FFCA28 làm điểm nhấn; chữ #2D2638. Quicksand cho tiêu đề/nút, Nunito Sans cho nội dung; hỗ trợ dấu tiếng Việt đầy đủ.
Desktop 1440x1000: khung giữa tối đa 1200px, chia khoảng 52/48; trái một headline “Cùng học vui, cùng chinh phục!”, một minh họa hai linh vật, ba chip “Quiz Battle”, “Solo · Duel · Co-op”, “Chơi cùng bạn”. Phải là form gọn, label rõ, tiến trình ba bước khi cần. Không kéo dài cột trái theo form để tạo khoảng trắng vô nghĩa.
Mobile 390px: một cột, logo và linh vật nhỏ, ưu tiên form, bàn phím không che CTA, không cuộn ngang; input chữ tối thiểu 16px, vùng chạm 44px.
Dùng cùng hệ nút tím pill có đáy nổi, input lavender bo 16px, khung 24–28px, icon và spacing xuyên suốt.

CÁC MÀN CẦN TẠO RIÊNG, đặt tên rõ theo danh sách:
01 — Đăng nhập V1: email, mật khẩu, hiện/ẩn mật khẩu, Quên mật khẩu, Đăng nhập, Tạo tài khoản và Chơi dưới dạng khách. Không checkbox ghi nhớ, không nickname login.
02 — Đăng ký / Email: Bước 1/3 “Bắt đầu hành trình”; email; CTA “Gửi mã xác minh”; quay lại đăng nhập. Khi nâng cấp guest, banner “Tạo tài khoản để giữ tiến trình của [biệt danh]”.
03 — Đăng ký / OTP: Bước 2/3 “Kiểm tra hộp thư nhé!”; hiển thị email mẫu, OTP 6 chữ SỐ có thể bắt đầu bằng 0; hỗ trợ dán cả mã, autofill one-time-code, focus/backspace rõ ràng. CTA “Xác minh mã”; “Gửi lại sau 60 giây”, “Đổi email”. Mã có hiệu lực 5 phút. Thiết kế variant lỗi sai mã, hết hạn, gửi email thất bại và bị giới hạn thử.
04 — Đăng ký / Hoàn tất: Bước 3/3, email đã xác minh, biệt danh 2–30 ký tự, mật khẩu và xác nhận; hướng dẫn “Dùng cụm từ dễ nhớ, 15–128 ký tự”; cho hiện/ẩn; CTA “Tạo tài khoản”. Chỉ đến bước này mới nhập mật khẩu. Không đánh giá “siêu an toàn” dựa đơn thuần vào độ dài.
05 — Quên mật khẩu / Email: “Lấy lại chìa khóa của bạn”; email, CTA “Gửi mã”; phản hồi trung tính “Nếu có tài khoản với email này, mã sẽ được gửi tới hộp thư của bạn”.
06 — Quên mật khẩu / OTP: dùng cùng component OTP và trạng thái gửi lại/đổi email của đăng ký; phân biệt rõ purpose đặt lại mật khẩu.
07 — Quên mật khẩu / Mật khẩu mới: chỉ sau xác minh, hai trường mật khẩu mới và xác nhận, quy tắc 15–128 ký tự; CTA “Lưu mật khẩu”; nhắc mọi phiên cũ sẽ được đăng xuất.
08 — Đặt lại mật khẩu thành công: linh vật ôm chìa khóa, dấu tích, “Mật khẩu đã được cập nhật”; CTA “Về đăng nhập”. Không tự đăng nhập.
09 — Chơi khách / Vào phòng: biệt danh, mã phòng tùy chọn nếu muốn tham gia phòng đã có, CTA “Vào phòng chờ”; lối “Chơi Solo / Tạo phòng” khi chưa có mã. Mã phòng đúng 6 ký tự A–Z hoặc 2–9, ví dụ DQ8K24, KHÔNG dùng DQ-XXXX. Mã phòng khác OTP email. Guest có thể chơi và nhận thưởng theo luật trận; nâng cấp tài khoản giữ tiến trình. Không tạo guest mới nếu đã có danh tính. Có variant phòng không tồn tại/đầy/đã bắt đầu/mất kết nối. Vào phòng không tự bắt đầu trận.
10 — Trạng thái & xác nhận tài khoản: các dialog cùng hệ hình ảnh cho (a) guest đăng nhập tài khoản khác: không tự gộp tiến trình, xác nhận chuyển hồ sơ; (b) đang có phòng: yêu cầu rời phòng trước khi đổi danh tính, không tự rời; (c) phiên hết hạn: CTA đăng nhập lại; (d) tài khoản hiện chỉ dùng trên localhost, guest vẫn dùng được trên LAN: lời giải thích ngắn, CTA chơi khách. Có loading/retry.
11 — Bảo mật tài khoản: phần hồ sơ cùng phong cách, đổi mật khẩu với mật khẩu hiện tại/mới/xác nhận, Đăng xuất và Đăng xuất mọi thiết bị; confirm rõ và trạng thái thành công.
12 — Mobile Auth: tạo ít nhất hai artboard mobile thực tế cho OTP và hoàn tất đăng ký, cùng phong cách, không chỉ thu nhỏ desktop.

CHUYỂN ĐỘNG VÀ TƯƠNG TÁC
Nếu tạo HTML prototype, hiện thực tương tác an toàn tại local UI: nút squish nhấn xuống 2–3px trong 120ms, hover nâng nhẹ 2px; mascot thở nhẹ 3–4 giây, vẫy tai một lần khi chuyển bước; step transition fade/slide 12px trong 220–280ms; focus halo tím; OTP nhận ký tự bounce nhẹ, lỗi rung một lần rất nhỏ kèm văn bản; thành công confetti nhỏ một lần 600–900ms.
Tôn trọng prefers-reduced-motion: tắt chuyển động trang trí/confetti/rung, giữ phản hồi tĩnh; không nhấp nháy hay chạy celebration khi mới nhập đủ mã. Không chặn paste, password manager, keyboard; label liên kết input, focus nhìn thấy, lỗi có text/aria-live. Dùng một input OTP thật có thể style thành sáu ô.
Prototype chuyển giữa các bước bằng trạng thái mô phỏng có ghi rõ trong phần bàn giao; không alert() thay cho UI. Không tuyên bố xác thực hay vào phòng thật nếu không có server.

GIỚI HẠN NỘI DUNG
Không Google/Discord/Apple OAuth, referral, thưởng tân thủ 100/50 Xu, ghép đôi tài khoản, random matchmaking, QR scanner, rank/bạn bè/chat cộng đồng, game mới, số người online hoặc latency/server region giả. Không đưa chi tiết kỹ thuật backend vào giao diện người dùng ngoài thông báo giới hạn môi trường localhost/LAN cần thiết.
Không sao chép các lời hứa sai trên màn cũ. Giữ vẻ đẹp và tính cách hiện tại, nâng chất lượng bố cục và độ đầy đủ luồng.

OUTPUT
Tạo các màn hình riêng trong project, tên bắt đầu “Auth V1 — …”, có liên kết prototype khi công cụ hỗ trợ. Ưu tiên đủ các luồng và style đồng nhất; các lỗi có thể là variants, không dồn tất cả màn thành một dashboard hoặc một ảnh contact sheet.
