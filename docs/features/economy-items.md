# Kinh tế và vật phẩm

> **Mục đích:** Điểm thưởng, ví và vật phẩm trong phạm vi V1.
> **Đối tượng:** Chủ dự án, lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-09.
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../architecture/decisions.md).

Game Score thuộc engine; Coins/XP thuộc platform; không có Rank V1.

`RewardsService` tính grant, persistence áp dụng grant trong transaction kết quả. Các số sau là **PROPOSAL**: Solo 10 Coins, Duel 6 +10 nếu thắng không hòa, Co-op hoàn thành 12; 20 XP mỗi grant. Chỉ trusted pack do seed/admin tin cậy mới được thưởng. Tối đa 10 session thưởng/player/ngày UTC trong foundation; Coins và XP cùng cap. Pack do guest nhập không thưởng Coins/XP. Định nghĩa ngày UTC được chọn rõ cho server, không dùng clock browser.

Shop bán cosmetic vĩnh viễn và Skill tiêu hao. Khung bạc hà giá 250 Coins. Các endpoint có list/purchase/inventory/equip. Giá lấy từ DB; client không gửi giá, balance hoặc delta. Mỗi purchase có UUID requestId, retry cùng requestId không trừ thêm. Không cấp Coins miễn phí khi tạo guest.

Gift, reaction và hiển thị cosmetic đã trang bị trong trận vẫn ở backlog. Duel cấp cùng bộ Skill và lượt miễn phí cho hai bên theo layout.

Guest local chưa có chống farm qua tạo identity mới. Reward cap chỉ là hàng rào phát triển, chưa đủ cho economy công khai. Cần quyết định auth/abuse trước Internet deployment.

Mỗi giao dịch Skill thêm một lượt vào kho trong cùng transaction với trừ Coins. Giá playtest lần lượt là Hint 10, 50/50 15, Che 20 và Làm mờ 25 Coins. Mua và dùng lượt kho cần phiên tài khoản chính chủ. Slot khách thứ hai chung màn hình không dùng kho host. Auth tài khoản hiện chỉ dùng localhost. Lượt mua chưa dùng tồn tại qua trận. Lượt miễn phí thuộc riêng trận và hết khi trận kết thúc hoặc bị hủy. Server lưu biên nhận `QuizSkillUse` cùng giao dịch trừ kho để retry không trừ thêm. Một lượt đã kích hoạt được trừ ngay, kể cả khi trận bị hủy sau đó.
