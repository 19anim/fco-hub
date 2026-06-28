# FIFAAddict Stat Colors — Design Spec

**Date:** 2026-06-27

## Goal

Clone logic màu chỉ số của FIFAAddict cho chỉ số chính, OVR/vị trí, và chỉ số thành phần trong FCO Hub. Khi chỉ số được cộng cao bằng Grade, Lvl, hoặc Bonus, màu phải đổi đúng các mốc cao như `150+` vàng cam và `160+` xanh ngọc.

## Scope

- Cập nhật logic màu ở client, ưu tiên helper chung `statColor()` trong `client/src/fco/helpers.js`.
- Áp dụng cho mọi nơi đang dùng `statColor()`, gồm DetailView OVR/vị trí và các chỉ số chính/thành phần nếu đã render qua helper này.
- Không thay đổi API/server schema.
- Không crawl FIFAAddict runtime trong app; bảng màu là dữ liệu tĩnh lấy từ CSS/class FIFAAddict.

## Color Scale

Dùng bảng màu tương ứng `foattrcolor0–11` của FIFAAddict:

| Min value | Color |
| ---: | --- |
| fallback / invalid | `#6b6e76` |
| `<60` | `#6b6e76` |
| `60` | `#9ea6b2` |
| `70` | `#deded8` |
| `80` | `#2194d6` |
| `90` | `#175dde` |
| `100` | `#6e3bff` |
| `110` | `#b33bff` |
| `120` | `#cf13c0` |
| `130` | `#dc0000` |
| `140` | `#c99b00` |
| `150` | `#ffa800` |
| `160` | `#11caaa` |

The helper should evaluate from highest threshold to lowest threshold so future high values keep the top color.

## Component Behavior

`DetailView.jsx` should not duplicate thresholds. It should call `statColor(value)` wherever stat-like numbers are colored:

- header/display OVR,
- position ratings,
- main stat groups,
- detailed stat rows,
- related card OVR if already using the same helper.

During implementation, audit `AllStats` and `MainOnlyStats` sub-components inside `DetailView.jsx`. If stat values are colored via a CSS class or inline hex other than `statColor()`, replace that coloring with `style={{ color: statColor(value) }}`.

## Testing

Add or update unit coverage for `statColor()` boundaries:

- invalid input returns `#6b6e76`,
- exact lower boundaries: `60`, `70`, `80`, `90`, `100`, `110`, `120`, `130`, `140`, `150`, `160`,
- just-below boundaries such as `59`, `69`, `139`, `149`, `159`,
- a high value above `160` keeps `#11caaa`.

Manual verification should open a DetailView player with high Grade/Lvl/Bonus and confirm values at `140+`, `150+`, and `160+` visibly match the FIFAAddict palette.