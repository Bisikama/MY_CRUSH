# Tài liệu DuoQuest

> **Mục đích:** Mục lục chính để tìm tài liệu theo nhu cầu và xác định nơi lưu tài liệu mới.
> **Đối tượng:** Chủ dự án, lập trình viên, người thiết kế, QA và agent.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-08.
> **Liên quan:** [README dự án](../README.md), [Hướng dẫn agent](../AGENTS.md), [Quy định tài liệu](documentation-guide.md).

## Bắt đầu theo nhu cầu

- **Hiểu sản phẩm:** [Phạm vi](product/scope.md) → [Kiến trúc](architecture/overview.md) → [Quyết định](architecture/decisions.md). [Hiện trạng](project/current-state.md) là ảnh chụp lịch sử, cần đối chiếu source mới nhất.
- **Triển khai tính năng:** [AGENTS](../AGENTS.md) → [Quyết định](architecture/decisions.md) → đặc tả trong `features/` → [Contracts](architecture/contracts.md) → source/tests liên quan. Có thể dùng [mẫu task](prompts/implement-task.md).
- **Xem thiết kế Stitch:** [Auth tối giản](stitch/auth/minimal-auth.md) chứa project/screen ID và phạm vi kiểm chứng. So với [đặc tả Auth](features/auth.md) trước khi chuyển thiết kế thành code.
- **Review trang tài khoản:** [Brief hồ sơ desktop](stitch/account/account-profile.md) chứa prompt Pastel Playfield, screen ID và giới hạn concept danh hiệu; chưa tích hợp web/backend.
- **Thiết kế màn chọn game:** [Brief hub và tích hợp Pastel Lavender](stitch/game-hub/design-brief.md) lưu lịch sử prompt Matcha Meadow, screen ID Pastel Lavender `7d9066eeafb84b979a3266c355b4f90e` và phạm vi đã tích hợp vào web tại `/`.
- **Chạy và kiểm thử:** [Lệnh chạy nhanh cạnh file env](../run-project.md) → [README dự án](../README.md) → [Roadmap và hướng dẫn test](project/roadmap-quality.md) → [Bằng chứng kiểm chứng](quality/verification.md).
- **Viết tài liệu:** đọc [quy định](documentation-guide.md), tìm chủ đề có sẵn, rồi dùng [mẫu tài liệu](templates/document.md) nếu thật sự cần file mới.

## Danh mục và nơi lưu

| Nhóm             | Tài liệu                                                   | Dùng để làm gì                                                                            |
| ---------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Sản phẩm         | [Phạm vi](product/scope.md)                                | Mục tiêu V1, mode/layout, giới hạn sản phẩm.                                              |
| Kiến trúc        | [Tổng quan](architecture/overview.md)                      | Stack, module và ranh giới workspace.                                                     |
| Kiến trúc        | [Dữ liệu](architecture/data-model.md)                      | Mô hình dữ liệu, persistence và transaction.                                              |
| Kiến trúc        | [Quyết định](architecture/decisions.md)                    | Nguồn chính của LOCKED / PROPOSAL / OPEN.                                                 |
| Kiến trúc        | [Contracts](architecture/contracts.md)                     | REST, Socket.IO và dữ liệu giao tiếp.                                                     |
| Tính năng        | [Quiz](features/quiz.md)                                   | Luật Quiz theo mode.                                                                      |
| Tính năng        | [Room, realtime, LAN](features/rooms-realtime-lan.md)      | Lifecycle phòng, phân quyền slot, reconnect và LAN.                                       |
| Tính năng        | [Kinh tế, vật phẩm](features/economy-items.md)             | Game Score, Coins, XP, shop và item.                                                      |
| Tính năng        | [Bộ câu hỏi](features/question-packs.md)                   | Định dạng JSON, validation và import.                                                     |
| Tính năng        | [Auth và phân quyền](features/auth.md)                     | Email OTP, phiên, guest/account và role.                                                  |
| Dự án            | [Roadmap và chất lượng](project/roadmap-quality.md)        | Mốc triển khai, backlog và lệnh kiểm thử.                                                 |
| Dự án            | [Hiện trạng theo mốc](project/current-state.md)            | Ảnh chụp source, phần đã có và phần còn mở.                                               |
| Kiểm chứng       | [Kết quả kiểm chứng](quality/verification.md)              | Lệnh, kết quả, thời điểm và giới hạn bằng chứng.                                          |
| Stitch / Auth    | [Brief ban đầu](stitch/auth/design-brief.md)               | Tham khảo lịch sử; đã có brief tối giản mới hơn.                                          |
| Stitch / Auth    | [Brief tối giản và screen ID](stitch/auth/minimal-auth.md) | Thiết kế được đề xuất, tài nguyên và lịch sử kiểm tra canvas.                             |
| Prompt           | [Task triển khai](prompts/implement-task.md)               | Mẫu giao việc cho coding agent.                                                           |
| Stitch / Account | [Hồ sơ desktop](stitch/account/account-profile.md)         | Prompt, concept pastel và kết quả kiểm tra màn tài khoản.                                 |
| Stitch / Hub     | [Màn chọn game](stitch/game-hub/design-brief.md)           | Brief Matcha Meadow và bản tích hợp Pastel Lavender (`7d9066eeafb84b979a3266c355b4f90e`). |
| Prompt           | [Tạo bộ câu hỏi](prompts/generate-question-pack.md)        | Prompt soạn JSON đúng schema.                                                             |
| Quản lý          | [Quy định tài liệu](documentation-guide.md)                | Phân loại, tên file, metadata và vòng đời tài liệu.                                       |
| Mẫu              | [Tài liệu mới](templates/document.md)                      | Khung tối thiểu cho một tài liệu mới.                                                     |

`README.md` và `AGENTS.md` ở root là điểm vào dự án và quy định agent. Skill vẫn nằm trong `.agents/skills/`, không chuyển vào kho tài liệu. `doc/` chứa bản Word gốc cục bộ và đang bị Git bỏ qua; người clone repo có thể không có thư mục này.

Chỉ tạo `operations/` khi có hướng dẫn vận hành riêng, hoặc `archive/` khi có tài liệu lỗi thời cần lưu. Khi tạo thêm tài liệu, bổ sung một dòng có mô tả và liên kết vào mục lục này.
