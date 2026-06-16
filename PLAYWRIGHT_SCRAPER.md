# Playwright Scraper - FIFAAddict Full Data Clone

## 🎯 Mục đích

Scraper này sử dụng **Playwright browser automation** để bypass anti-bot protection và lấy **TOÀN BỘ data** từ vn.fifaaddict.com.

## ✅ Ưu điểm so với API approach

| Feature | API Approach | Playwright Approach |
|---------|--------------|---------------------|
| Anti-bot | ❌ Bị block token | ✅ Giả lập browser thật |
| Data limit | ❌ 100 players | ✅ ~15,000+ players |
| Season filter | ❌ Không hoạt động | ✅ Intercept all responses |
| Rate limit | ❌ 401 errors | ✅ Human-like delays |

## 🚀 Cách sử dụng

### 1. Start server

```bash
cd server
npm run dev
```

### 2. Trigger Playwright scraper

**Endpoint**: `POST /api/enrichment/fifaaddict/scrape-playwright`

**Body** (tất cả optional):
```json
{
  "delayMs": 2000,     // Delay giữa các page (ms)
  "maxPages": 1000,    // Số pages tối đa
  "headless": true     // false = show browser (debug)
}
```

**Example với curl**:
```bash
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/scrape-playwright \
  -H "Content-Type: application/json" \
  -d '{"headless": false, "maxPages": 100}'
```

### 3. Monitor progress

**GET** `/api/enrichment/status`

```bash
curl http://localhost:5000/api/enrichment/status
```

## 🔧 Cách hoạt động

1. **Launch Chromium** với flags anti-detection
2. **Navigate** đến `vn.fifaaddict.com/fo4db`
3. **Intercept API responses** từ network requests
4. **Parse players** từ intercepted data
5. **Pagination**: Click next button hoặc scroll để load thêm
6. **Upsert to DB**: Mỗi player được lưu vào `playerenrichments`
7. **Stop conditions**:
   - Reached maxPages
   - 10 consecutive pages với 0 new players
   - No more pages (navigation fails)

## 📊 Expected results

- **Time**: ~30-60 phút (với 1000 pages, delay 2s)
- **Players**: 10,000-15,000 unique cards
- **Database**: Collection `playerenrichments`

## 🐛 Troubleshooting

### Browser không mở (headless mode)
- Set `"headless": false` để xem browser
- Check console logs cho Playwright errors

### Không intercept được API responses
- FIFAAddict có thể thay đổi endpoint URL
- Check browser DevTools Network tab để xem request pattern

### Rate limit / 403 errors
- Tăng `delayMs` lên 3000-5000
- Giảm `maxPages` xuống 500

### Memory issues
- Playwright browser tốn ~500MB RAM
- Close browser sau mỗi 100 pages và restart

## 🔄 Alternative: Run with visible browser

Để debug hoặc xem progress real-time:

```bash
curl -X POST http://localhost:5000/api/enrichment/fifaaddict/scrape-playwright \
  -H "Content-Type: application/json" \
  -d '{"headless": false, "delayMs": 3000, "maxPages": 50}'
```

Browser sẽ mở và bạn có thể xem:
- Page navigation
- API responses
- Data being parsed

## 📝 Next steps sau khi có data

1. **Verify data**: Check `playerenrichments` collection count
2. **Fetch details**: Run `bulkScrapeDetails` để lấy 34 chỉ số chi tiết
3. **Sync Nexon**: `POST /api/players/sync-nexon` để link với Nexon metadata
4. **Match players**: `POST /api/enrichment/fifaaddict/sync-all` để tạo aliases

## ⚠️ Notes

- **Legal**: Chỉ dùng cho personal/educational purposes
- **Performance**: Playwright tốn nhiều resources hơn API approach
- **Maintenance**: Website layout thay đổi → cần update selectors
