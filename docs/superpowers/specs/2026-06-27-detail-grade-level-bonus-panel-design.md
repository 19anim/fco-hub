# Detail Grade, Level, and Bonus Panel — Design Spec

**Date:** 2026-06-27

## Goal

Bổ sung khả năng cộng chỉ số theo **Lvl** và **Bonus** vào trang chi tiết cầu thủ, cạnh cơ chế **Grade** hiện có. Người dùng có thể nhập các mức cộng thủ công giống bảng chọn trên FIFAAddict: Grade dùng rule nâng cấp hiện tại, còn Lvl và Bonus chỉ là điểm cộng trực tiếp.

## Scope

- Áp dụng trong trang detail cầu thủ tại `DetailView.jsx`.
- Mở rộng `fa-upgrade-panel` hiện có thay vì tạo panel mới.
- Không crawl hay tự suy luận team color từ dữ liệu FIFAAddict.
- Không thay đổi API/server schema.

## UI Behavior

Panel mặc định thu gọn để tránh chiếm diện tích hero section. Dòng thu gọn hiển thị tóm tắt các nguồn cộng chỉ số, ví dụ:

`Grade +5 (stat +4) · Lvl +10 · Bonus +3 · Stat +17`

Khi người dùng bấm panel hoặc chevron, panel mở rộng và hiển thị 3 selector:

1. **Grade** — giữ selector `+1…+13` hiện có.
2. **Lvl** — selector số cộng trực tiếp, mặc định `+0`.
3. **Bonus** — selector số cộng trực tiếp, mặc định `+0`.

Panel giữ trạng thái mở sau khi người dùng chọn giá trị. Khi đổi cầu thủ, panel reset về `Grade +1`, `Lvl +0`, `Bonus +0` và thu gọn lại.

## Stat Calculation

`grade` giữ behavior hiện tại:

- OVR/position rating dùng `getOvrIncreaseForLevel(grade)`.
- Main stat và detailed stat dùng `grade - 1`.

`levelBonus` và `teamColorBonus` cộng trực tiếp theo số chọn:

- Chọn Lvl `10` nghĩa là cộng `+10` vào OVR, position rating, main stats, và detailed stats.
- Chọn Bonus `10` nghĩa là cộng `+10` vào OVR, position rating, main stats, và detailed stats.

Tổng cộng hiển thị trong summary dùng:

`gradeStatBonus + levelBonus + teamColorBonus`

OVR/header/position rating dùng tổng riêng vì Grade OVR có rule nâng cấp riêng:

`gradeOvrBonus + levelBonus + teamColorBonus`

## Component Changes

- Thêm state trong `DetailView`:
  - `levelBonus`
  - `teamColorBonus`
  - `isUpgradePanelOpen`
- Mở rộng helper cộng chỉ số hiện tại để nhận cả grade bonus và flat bonus.
- Tái sử dụng style của `fa-upgrade-panel`, thêm CSS cho trạng thái thu gọn/mở rộng và các selector mới.
- Giữ tên UI là `Bonus` để khớp ngôn ngữ FIFAAddict, dù logic chỉ là cộng điểm trực tiếp.

## Testing

Manual verification trên trang detail player:

1. Mở player detail, panel mặc định thu gọn với `Grade +1`, `Lvl +0`, `Bonus +0`.
2. Expand panel, đổi Grade và xác nhận behavior cũ vẫn đúng.
3. Chọn Lvl `10`, OVR/position/stats tăng thêm `+10`.
4. Chọn Bonus `10`, OVR/position/stats tăng thêm `+10`.
5. Chọn cả Grade, Lvl, Bonus và xác nhận cộng dồn đúng.
6. Thu gọn/mở rộng panel hoạt động.
7. Đổi player detail, selector reset về mặc định và panel thu gọn lại.
