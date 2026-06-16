# Upgrade Simulator — Design Spec

**Date:** 2026-06-15
**Goal:** Xây dựng Simulator giả lập nâng cấp cầu thủ FCO Online (mục tiêu: viral, cảm giác thật, animation sát in-game).

## 1. Cơ chế (theo đề xuất)
- **Cấp:** +0 đến +13. Mỗi lần nâng thành công: OVR tăng theo bảng giả lập (đề xuất: +0→+13 tổng tăng 20 OVR).
- **Nguyên liệu:** Dùng cầu thủ thật từ DB.
  - Mỗi thẻ nhiên liệu đóng góp % vào thanh tiến độ (5 vạch = 100%).
  - Tỉ lệ thành công: 30% (1 vạch) → 95% (5 vạch).
- **Thất bại:**
  - Chế độ khó: **Rớt cấp** (-1 cấp).
  - Chế độ dễ: **Giữ nguyên** cấp.
- **Animation:** 1-2 giây. Glow, flip, loading bar, effect màu (xanh=thành công, đỏ=thất bại).

## 2. Kiến trúc & UI
- **Route:** `#/upgrade` trong FcoApp.
- **Components:**
  - `UpgradeView.jsx`: View chính.
  - `PlayerPicker.jsx`: Tách từ `CompareView.jsx` thành component tái sử dụng.
- **Logic:** React state (`upgradeLevel`, `inputCards`, `mode` [khó/dễ], `animationState` [idle/upgrading/result]).

## 3. UI Flow
1. **Tìm & Chọn cầu thủ chính:** dùng `PlayerPicker`. Hiện thẻ +0 mặc định.
2. **Chọn 5 thẻ nhiên liệu:** bấm vào 5 slot trống, gọi `PlayerPicker`.
3. **Chọn mode:** Switch/Checkbox (Khó/Dễ).
4. **Nâng cấp:** Nút bấm -> 1.5s animation -> Hiện kết quả (cấp mới, OVR mới).

**Bạn review design này nhé, nếu OK tôi chuyển sang lập implementation plan.**
