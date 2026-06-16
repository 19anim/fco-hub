# Discovery Bug Fix - 2026-06-13

## 🐛 Vấn đề phát hiện

Discovery job bị **stuck ở 100 players** và không tăng được số lượng dù đã chạy qua 5+ mùa giải.

### Root Cause Analysis

1. **API FIFAAddict trả về cùng 100 players cho mọi page**
   - Page 1: 100 unique players ✅
   - Page 2-200: Cùng 100 players đó lặp lại ❌

2. **Logic cũ dùng global `seenUids` Set**
   - Chặn mọi UID đã xuất hiện ở bất kỳ mùa nào
   - Không insert được players từ mùa 2 trở đi vì đã thấy ở mùa 1

3. **Không có early exit mechanism**
   - Crawl đến 200 pages dù biết toàn duplicate
   - Lãng phí thời gian và API calls

## ✅ Giải pháp đã áp dụng

### 1. Fix duplicate check logic
**Trước:**
```javascript
if (uid && !seenUids.has(uid)) {
  // Insert player
}
```

**Sau:**
```javascript
const exists = await PlayerEnrichment.findOne({
  source: 'fifaaddict-vn',
  sourceUid: uid,
  seasonCode: enrichment.seasonCode
}).lean();

if (!exists) {
  // Insert player - allow same UID across different seasons
}
```

### 2. Thêm consecutive duplicate page detection
```javascript
let consecutiveDuplicatePages = 0;

if (newInPage === 0 && skippedInPage > 0) {
  consecutiveDuplicatePages++;
  if (consecutiveDuplicatePages >= 3) {
    console.log('API returning duplicate data, moving to next season');
    break;
  }
}
```

### 3. Giảm maxPages từ 200 → 5
Vì API không phân trang đúng, chỉ cần fetch 3-5 pages đầu là đủ.

### 4. Thêm detailed logging
```javascript
console.log(`[Discovery] Season ${season.seasonName} page ${page}: ${newInPage} new, ${skippedInPage} already in DB`);
console.log(`[Discovery ERROR] Page ${page} year ${year}: ${err.message} (status: ${err.response?.status})`);
```

## 📈 Kết quả mong đợi

- **Trước fix**: Stuck ở 100 players, chạy mãi không xong
- **Sau fix**: 
  - Fetch được ~14,800 players từ 148 seasons
  - Thời gian hoàn thành: ~4-5 phút
  - Skip nhanh các trang duplicate

## 🚀 Để chạy lại

1. Restart server để load code mới
2. Trigger discovery: `POST /api/enrichment/discover`
3. Monitor qua: `GET /api/enrichment/status`

## 📝 Notes

- API FIFAAddict có vẻ không hỗ trợ pagination đúng cách
- Mỗi season chỉ nên fetch 1-3 pages đầu
- Cần monitor X-ARAIWA token expiry (4 phút)
