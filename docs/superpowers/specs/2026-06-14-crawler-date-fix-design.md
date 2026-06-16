# FCO Crawler Date Extraction Fix — Design Spec (BE)

**Date:** 2026-06-14
**Status:** Planned — NOT yet implemented. BE đang chạy job, chỉ implement khi sẵn sàng.
**Scope:** `server/src/services/fcoCrawler.js` (+ new unit tests). Optionally `event.controller.js` (status recompute) — see §6.

## 1. Vấn đề (đã xác minh)

Một bài viết sự kiện thường nhắc TỚI NHIỀU khoảng ngày của NHIỀU event khác nhau (quảng cáo chéo). Crawler hiện gom tất cả range rồi giữ bất kỳ range nào "chứa hôm nay" → gán nhầm ngày của event khác cho bài hiện tại.

**Ca thực tế:** bài `nap-tich-luy-fc-mc-09-06-12-06`:
- Khối chính thức: `"Thời gian diễn ra: Bắt đầu: 11h00 ngày 09.06.2026 Kết thúc: 23h59 ngày 12.06.2026"` → **ngày thật = 09–12/06** (đã hết hạn).
- Nhưng bài còn nhắc `"Từ ngày 13.06 - 21.06, Sự kiện nạp tích lũy FC sẽ xuất hiện..."` (event khác).
- Crawler loại range 09–12 (đã qua), giữ 13–21 → DB lưu SAI `startDate=13/06, endDate=21/06, status=Active`.

**Hệ quả:** event đã hết hạn "sống lại" với ngày mượn → đây chính là bug "lâu lâu lọt event cũ" + việc gần như mọi event đều hiện cùng khoảng 13–21.

## 2. Nguyên nhân gốc (trong `fcoCrawler.js`)

- `getDateRanges(text)` chạy CẢ 3 regex pattern và gộp mọi kết quả vào 1 mảng phẳng, không phân biệt độ tin cậy:
  1. Pattern 1: `Bat dau ... Ket thuc ...` — **khối chính thức của bài, đáng tin nhất**.
  2. Pattern 2: `Tu ngay X den Y` — câu văn, có thể là event khác.
  3. Pattern 3: `X - Y` — range rời, nhiễu nhất.
- `getEvents()` lặp qua mọi range, chỉ push range "chứa hôm nay" với `status:'Active'`. → khi range thật đã hết hạn, nó vớ phải range nhiễu còn hiệu lực.

## 3. Hướng sửa

### 3.1 Ưu tiên nguồn ngày theo độ tin cậy
Thay vì gộp phẳng, `getDateRanges` trả về range **theo tầng ưu tiên**:
- Nếu Pattern 1 (Bắt đầu/Kết thúc) có kết quả → **CHỈ dùng Pattern 1**, bỏ qua 2 & 3.
- Nếu không có Pattern 1 → thử Pattern 2.
- Nếu không có Pattern 2 → mới dùng Pattern 3.

Lý do: khối "Bắt đầu/Kết thúc" là metadata chính thức mỗi bài tự mô tả mình; các range trong câu văn quảng cáo chéo mới gây nhiễu.

### 3.2 Không "mượn" ngày của event khác
Trong `getEvents()`, KHÔNG còn lọc bỏ range đã hết hạn để tìm range khác. Lấy range **đại diện của bài** (range đầu tiên ở tầng ưu tiên cao nhất), rồi tính status từ chính range đó:
- `endDate < hôm nay` → `status: 'Expired'`.
- `startDate <= hôm nay <= endDate` → `status: 'Active'`.
- `startDate > hôm nay` → `status: 'Active'` (sắp diễn ra, vẫn lưu — FE đã lọc theo endDate).
- Không tìm được range nào → `status: 'Unknown'` (như hiện tại).

→ Event 09–12 sẽ được lưu đúng `Expired`, không hiện ở FE.

## 4. Tách hàm thuần để test độc lập (không đụng job)

Trích logic ngày thành các hàm thuần, export riêng để unit-test bằng `node:test` mà KHÔNG cần network/DB:
- `extractDateRanges(readableText)` — nhận text đã làm sạch, trả `{ ranges, tier }` theo ưu tiên §3.1.
- `pickRepresentativeRange(ranges)` — chọn range đại diện cho bài.
- `computeStatus(range, today)` — trả `'Active' | 'Expired' | 'Unknown'` theo §3.2.

Các hàm này nhận `today` là tham số (không gọi `new Date()` ẩn) để test xác định.

## 5. Test (node:test, offline)

Tạo `server/src/services/fcoCrawler.dates.test.mjs` với các fixture text trích từ trang thật:
1. Có khối Bắt đầu/Kết thúc + range nhiễu khác → chỉ lấy 09–12, status Expired (với today=14/06).
2. Chỉ có "Từ ngày X đến Y" (không có Bắt đầu/Kết thúc) → lấy range đó.
3. Chỉ có range rời "X - Y" → fallback Pattern 3.
4. Không có ngày → Unknown.
5. `computeStatus`: các nhánh Active/Expired/sắp diễn ra.

Chạy: `node --test src/services/fcoCrawler.dates.test.mjs` (không kết nối DB, không scan thật).

## 6. Out of scope / tùy chọn

- **Backfill dữ liệu cũ:** Event đã lưu sai ngày trong DB sẽ tự đúng sau lần `POST /api/events/scan` kế tiếp (vì upsert theo `launchUrl`). Không cần migration. Nếu muốn ép sửa ngay: chạy scan thủ công sau khi deploy fix.
- **Đổi `getEvents` controller để lọc theo ngày phía server:** giữ nguyên cho spec này; FE đã lọc `endDate >= NOW`. Có thể gộp vào spec BE riêng (cron auto-scan) sau.
- **Cron auto-scan 00:00:** thuộc spec BE khác, không nằm ở đây.

## 7. Tiêu chí hoàn thành

- [ ] `extractDateRanges` ưu tiên đúng tầng (Pattern 1 > 2 > 3).
- [ ] Event `nap-tich-luy-fc-mc-09-06-12-06` cho ra 09–12/06, status `Expired` khi today ≥ 13/06.
- [ ] Không còn event "mượn" ngày của event khác.
- [ ] Toàn bộ test `fcoCrawler.dates.test.mjs` pass, chạy offline.
- [ ] Không thay đổi hành vi network/DB của crawler ngoài logic chọn ngày.
