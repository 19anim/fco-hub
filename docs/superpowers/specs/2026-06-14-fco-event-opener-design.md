# FCO Event Opener — Design Spec (FE-only)

**Date:** 2026-06-14
**Scope:** Frontend only. No backend changes (BE đang chạy job, tránh crash).
**Target shell:** `FcoApp.jsx` (vỏ FE đang chạy, hash router, `fco.css`).

## 1. Mục tiêu

Thêm view "Sự kiện" vào FcoApp đang chạy, hiển thị các event FCO **còn hiệu lực**, cho phép mở nhanh hàng loạt (Mở tất cả / Chỉ sự kiện / Chỉ tin tức), tái hiện trải nghiệm cốt lõi của app `fco-event-opener` gốc.

Đồng thời fix bug "lâu lâu lọt event cũ không còn valid" — **xử lý hoàn toàn ở FE** bằng cách lọc theo `endDate >= hôm nay` sau khi fetch, không đụng tới DB/controller.

## 2. Bối cảnh kỹ thuật

- BE đã có sẵn endpoint `GET /api/events` (chỉ đọc, an toàn, không ảnh hưởng job đang chạy).
- `Event` model có sẵn các trường cần dùng: `title`, `launchUrl`, `dateLabel`, `status` (`Active`/`Unknown`/`Expired`), `startDate`, `endDate`, `isSubdomain`, `isNewsPage`.
- Phân loại: **Sự kiện** = `isSubdomain === true`; **Tin tức** = `isNewsPage === true`.
- Root cause bug: DB lưu `status` tĩnh tại thời điểm scan; event hết hạn vẫn ghi `Active` cho tới lần scan kế. → FE tự tính valid theo ngày thật, bỏ qua cột `status` để quyết định valid.

**Out of scope (để spec BE sau):** cron auto-scan mỗi ngày 00:00, sửa `getEvents` controller, lọc valid phía server.

## 3. Phạm vi thay đổi (toàn bộ trong `client/`)

| File | Thay đổi |
|------|----------|
| `client/src/fco/api.js` | Thêm `fetchEvents()` gọi `GET /api/events` |
| `client/src/fco/views/EventsView.jsx` | **Mới** — view hiển thị + nút mở |
| `client/src/fco/FcoApp.jsx` | Thêm nav item `events` + route render `EventsView` + truyền `showToast` |
| `client/src/fco/Icons.jsx` | Thêm icon Calendar nếu chưa có |

Không chạm `server/`. Không đổi `Event` model, controller, routes.

## 4. Logic lọc valid (FE)

Sau khi `fetchEvents()` trả về danh sách:

1. **Valid** nếu: `endDate >= startOfToday` **HOẶC** `status === 'Unknown'` (chưa rõ hạn → vẫn cho hiển thị, đánh dấu riêng).
2. **Loại bỏ** nếu: có `endDate` và `endDate < startOfToday` (đã hết hạn dù DB ghi gì).
3. So sánh theo mốc đầu ngày (`setHours(0,0,0,0)`) để không loại nhầm event hết hạn "hôm nay".

## 5. UI / UX

### 5.1 Bố cục

```
Sự kiện FCO còn hiệu lực                    [⟳ Tải lại]
Cập nhật: <ngày> · N sự kiện · M tin tức
─────────────────────────────────────────────
[ Mở tất cả (T) ] [ Chỉ sự kiện (N) ] [ Chỉ tin tức (M) ]
─────────────────────────────────────────────
⚠ Sắp hết hạn (≤3 ngày)
[card] [card] [card] ...

▶ Đang diễn ra
[card] [card] ...

(Chưa rõ hạn)   ← nếu có event Unknown
[card] ...
```

### 5.2 Card event
- Tiêu đề (`title`)
- 📅 `dateLabel`
- ⏳ Countdown: "còn X ngày" (tính từ `endDate`); event Unknown hiện "Chưa rõ hạn"
- Nút **[Mở →]** → `window.open(launchUrl, '_blank')`
- Nhãn loại: "Sự kiện" / "Tin tức"

### 5.3 Phân nhóm card
- **Sắp hết hạn (≤3 ngày):** viền/nhãn cảnh báo, đặt lên đầu.
- **Đang diễn ra:** còn lại, sort theo `endDate` gần nhất trước.
- **Chưa rõ hạn:** nhóm cuối (event `Unknown`), nhãn "Chưa rõ hạn".

### 5.4 Nút mở hàng loạt (tuần tự + nhắc popup)
- **Mở tất cả** → tất cả `launchUrl` valid.
- **Chỉ sự kiện** → `isSubdomain === true`.
- **Chỉ tin tức** → `isNewsPage === true`.
- **Mở tuần tự:** lặp danh sách, mỗi link `window.open(url, '_blank')` cách nhau ~300ms.
- **Phát hiện bị chặn:** nếu `window.open` trả `null` → hiện banner cảnh báo: *"Trình duyệt đã chặn popup. Hãy cho phép popup cho trang này rồi thử lại."* + nút Thử lại.
- **Toast tiến trình:** dùng `showToast` truyền từ FcoApp xuống ("Đang mở T trang...").

### 5.5 Trạng thái view
- **Loading:** spinner/skeleton theo style `fco.css`.
- **Empty:** "Hiện không có sự kiện nào còn hiệu lực."
- **Error:** "Không tải được sự kiện" + nút Thử lại.

## 6. Tích hợp FcoApp

- `NAV_ITEMS` thêm `{ id: 'events', label: 'Sự kiện', icon: I.Calendar }`.
- Trong `<main>`, thêm nhánh `activeView === 'events'` render `<EventsView showToast={showToast} />`.
- `parseHash` đã hỗ trợ view tùy ý → route `#/events` hoạt động sẵn, không cần đổi router.

## 7. Tiêu chí hoàn thành

- [ ] Vào `#/events` thấy danh sách event còn valid, không lọt event đã hết hạn.
- [ ] 3 nút mở hoạt động đúng phân loại; mở tuần tự; cảnh báo khi bị chặn popup.
- [ ] Phân nhóm "Sắp hết hạn / Đang diễn ra / Chưa rõ hạn" hiển thị đúng.
- [ ] Loading / empty / error states hoạt động.
- [ ] Không có thay đổi nào trong `server/`.
