# Quy định quản lý tài liệu

> **Mục đích:** Quy định nơi lưu, cách đặt tên, tra cứu và duy trì tài liệu DuoQuest.
> **Đối tượng:** Mọi người và agent tạo hoặc cập nhật tài liệu trong repo.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07.
> **Liên quan:** [Mục lục](README.md), [AGENTS](../AGENTS.md), [Mẫu tài liệu](templates/document.md).

## Chọn nơi lưu trước khi viết

Đọc mục lục, tìm tài liệu cùng chủ đề bằng `rg`, kiểm tra source liên quan và ưu tiên cập nhật tài liệu chính đã có. Chỉ tạo file mới khi có mục đích hoặc đối tượng đọc riêng. Không tạo các bản `final`, `new`, `v2` song song mà không nói rõ bản nào còn hiệu lực.

| Nội dung chính                                          | Nơi lưu                  | Ví dụ                             |
| ------------------------------------------------------- | ------------------------ | --------------------------------- |
| Mục tiêu, user story, giới hạn sản phẩm                 | `docs/product/`          | `scope.md`                        |
| Kiến trúc, dữ liệu, contract, quyết định xuyên hệ thống | `docs/architecture/`     | `overview.md`, `decisions.md`     |
| Quy tắc và hành vi của một tính năng/domain             | `docs/features/`         | `auth.md`, `quiz.md`              |
| Roadmap, backlog, ảnh chụp hiện trạng                   | `docs/project/`          | `current-state.md`                |
| Kết quả chạy kiểm tra và bằng chứng nghiệm thu          | `docs/quality/`          | `verification.md`                 |
| Brief, prompt, screen ID, ghi nhận thiết kế Stitch      | `docs/stitch/<feature>/` | `auth/minimal-auth.md`            |
| Prompt dùng lại ngoài Stitch                            | `docs/prompts/`          | `implement-task.md`               |
| Mẫu tài liệu dùng lại                                   | `docs/templates/`        | `document.md`                     |
| Runbook chạy, triển khai, backup, xử lý sự cố           | `docs/operations/`       | Chỉ tạo khi có nội dung thực tế.  |
| Tài liệu hết hiệu lực cần giữ để đối chiếu              | `docs/archive/`          | Ghi bản thay thế và ngày lưu trữ. |

Tài liệu có nhiều chủ đề được đặt theo mục đích chính, rồi liên kết tới các phần liên quan. Ví dụ, đặc tả room có quy tắc reconnect vẫn ở `features/`; quyết định chọn Socket.IO ở `architecture/`; kết quả thử mất mạng ở `quality/`.

Giữ `README.md`, `AGENTS.md` ở root và `SKILL.md` trong thư mục skill; không di chuyển các file có vai trò công cụ này. `doc/` là bản Word tham khảo cục bộ, đang bị `.gitignore` bỏ qua, không phải nơi viết Markdown mới. Bản AGENTS trong tài liệu gốc không thay thế AGENTS ở root.

## Tên file và metadata bắt buộc

- Tên thư mục/file dùng tiếng Anh, chữ thường, `kebab-case`; tiêu đề và nội dung có thể viết tiếng Việt. Ngoại lệ: `README.md`, `AGENTS.md`, `SKILL.md` theo vai trò công cụ.
- Không đánh số thứ tự liên tục cho cả kho tài liệu. Một tài liệu đang được cập nhật giữ tên ổn định; chỉ dùng ngày `YYYY-MM-DD` trong tên nếu đó là một bản ghi theo mốc riêng.
- Ngay sau tiêu đề H1, ghi **Mục đích**, **Đối tượng**, **Trạng thái**, **Cập nhật** và **Liên quan** theo [mẫu](templates/document.md).
- Ngày cập nhật dùng `YYYY-MM-DD`. Nếu chỉ chuyển thư mục hoặc sửa định dạng, ghi rõ điều đó; không đổi ngày kiểm chứng thành ngày di chuyển.
- Mục Liên quan phải có đường về mục lục cùng đặc tả hoặc source thực sự tồn tại. Tài liệu phụ thuộc bản Word cục bộ phải nói rõ người clone repo có thể không có nó.

Quy định metadata áp dụng cho nội dung trong `docs/`. README/AGENTS/skill ở root hoặc khu vực công cụ giữ định dạng phục vụ vai trò riêng; vẫn phải sửa tham chiếu nếu đường dẫn tài liệu thay đổi. File mẫu được phép để placeholder, nhưng phải điền trước khi dùng làm tài liệu thật.

## Trạng thái, thẩm quyền và bằng chứng

| Trạng thái tài liệu | Ý nghĩa                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `draft`             | Bản nháp/đề xuất chưa được xác nhận là tài liệu hiện hành.                                                        |
| `current`           | Tài liệu hiện hành cần được bảo trì theo source/phạm vi được duyệt. Không đồng nghĩa mọi chức năng đã nghiệm thu. |
| `historical`        | Ghi nhận theo mốc hoặc bản đã được thay thế; không dùng để khẳng định trạng thái source mới nhất.                 |

Các trạng thái này độc lập với **LOCKED / PROPOSAL / OPEN** trong [quyết định sản phẩm](architecture/decisions.md). Di chuyển file hoặc đổi trạng thái tài liệu không phê duyệt tính năng hay thay đổi quyết định sản phẩm.

Mỗi nội dung có một tài liệu chính. README giới thiệu và dẫn đường; đặc tả domain mô tả hành vi; source/contracts thể hiện triển khai; kết quả test ghi bằng chứng theo thời điểm. Nếu chúng mâu thuẫn, nêu rõ điểm lệch thay vì âm thầm coi prompt, screenshot hoặc báo cáo lịch sử là source of truth.

Với Stitch, ghi project URL/ID, screen ID cần dùng, ngày kiểm tra và nguồn chứng cứ: đọc được resource, có trên canvas, xem ảnh, đọc HTML, thử tương tác hay đã tích hợp backend. Các mức này không thay thế nhau. Gắn rõ trạng thái đề xuất cho nội dung chưa có trong sản phẩm. Không đưa bảng debug, lời hứa thưởng hoặc tính năng do công cụ tự thêm thành đặc tả mặc định.

## Quy trình cập nhật và lưu trữ

1. Tìm tài liệu chính và xác nhận source thực tế trước khi viết; chọn thư mục theo bảng trên.
2. Viết phần cần thiết, điền metadata và dùng liên kết thay cho sao chép nguyên nội dung sang nhiều nơi.
3. Cập nhật mục lục khi thêm, đổi tên, chuyển hoặc lưu trữ file; mô tả ngắn để người đọc biết file dùng làm gì.
4. Dùng liên kết Markdown tương đối theo vị trí file để duyệt được trên repo. Khi chuyển file, sửa cả liên kết bên trong, liên kết trỏ đến nó, đường dẫn trong code block, prompt, AGENTS, skill và mô tả API nếu có.
5. Giữ kết quả cũ kèm ngày/phạm vi; thêm ghi nhận mới khi trạng thái thay đổi. Không xóa lịch sử chỉ vì có kiểm tra mới hơn. Báo cáo theo mốc vẫn có thể ở `quality/` hoặc `project/`; chỉ chuyển `archive/` khi không còn là nguồn tra cứu chủ động và đã có tài liệu thay thế.
6. Kiểm tra không mất nội dung, không còn tham chiếu cũ, liên kết nội bộ tồn tại, định dạng đúng và file được Git theo dõi hoặc sẵn sàng đưa vào Git. Chỉ kiểm tra runtime phù hợp khi có chỉnh sửa code liên quan.

Không ghi secret, OTP thực, cookie/token phiên, mật khẩu, thông tin SMTP hoặc dữ liệu cá nhân thật vào tài liệu. Ví dụ chỉ dùng placeholder hoặc dữ liệu giả. Không copy `.env`, log hay ảnh chứa bí mật vào kho tài liệu.
