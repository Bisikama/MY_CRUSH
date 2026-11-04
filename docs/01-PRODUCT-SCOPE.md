# Phạm vi sản phẩm

Nguồn định hướng: `doc/DuoQuest_Kien_truc_va_Dac_ta_San_pham_V1.0.docx`. Bản concept v0.1 chỉ dùng tham khảo khi không mâu thuẫn V1.0.

V1 chỉ Quiz Battle, 3 mode `SOLO`, `DUEL`, `COOP` và 2 layout `SHARED_SCREEN`, `MULTI_DEVICE`. Layout không tạo engine mới. Game 2–3 chưa được chọn. Không có rank trong V1.

Luồng chính: tạo guest → chọn pack/mode/layout → tạo/join phòng → Ready → host Start → chơi → reveal → lưu result → xem kết quả/Rematch. Solo vẫn dùng room/session core. Shared screen hai người có một controller sở hữu hai slot đã cấp bởi server; không dùng playerId do client tự tạo.

Platform còn có pack import, profile/history, Coins/XP, shop/inventory. Gift, reaction và power-up là mục tiêu V1 nhưng còn backlog; không suy luận là đã có chỉ từ schema/types.

Ưu tiên local/LAN tin cậy. Không triển khai Internet, OAuth, microservices, public matchmaking hoặc tiền thật trong task nền tảng này.
