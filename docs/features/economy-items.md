# Kinh tế và vật phẩm

> **Mục đích:** Điểm thưởng, ví và vật phẩm trong phạm vi V1.
> **Đối tượng:** Chủ dự án, lập trình viên và QA.
> **Trạng thái:** `current`.
> **Cập nhật:** 2026-11-07 (sắp xếp tài liệu; các mốc kiểm chứng trong nội dung giữ nguyên).
> **Liên quan:** [Mục lục](../README.md), [Nguồn tham khảo](../architecture/decisions.md).

Game Score thuộc engine; Coins/XP thuộc platform; không có Rank V1.

`RewardsService` tính grant, persistence áp dụng grant trong transaction kết quả. Các số sau là **PROPOSAL**: Solo 10 Coins, Duel 6 +10 nếu thắng không hòa, Co-op hoàn thành 12; 20 XP mỗi grant. Chỉ trusted pack do seed/admin tin cậy mới được thưởng. Tối đa 10 session thưởng/player/ngày UTC trong foundation; Coins và XP cùng cap. Pack do guest nhập không thưởng Coins/XP. Định nghĩa ngày UTC được chọn rõ cho server, không dùng clock browser.

Shop foundation chỉ hỗ trợ cosmetic mua vĩnh viễn, seed khung bạc hà 250 Coins. Các endpoint có list/purchase/inventory/equip. Giá lấy từ DB; client không gửi giá, balance hoặc delta. Mỗi purchase có UUID requestId, retry cùng requestId không trừ thêm. Không cấp Coins miễn phí khi tạo guest.

Chưa có gift/reaction transport, render loadout trong trận, consume item hay gameplay effect. Muốn thêm phải đặc tả mode compatibility, cooldown, mute, idempotency và transaction cùng state effect. Cosmetic/gift không được đổi điểm/timer. Duel không được bật trợ giúp tạo lợi thế mặc định.

Guest local chưa có chống farm qua tạo identity mới. Reward cap chỉ là hàng rào phát triển, chưa đủ cho economy công khai. Cần quyết định auth/abuse trước Internet deployment.
