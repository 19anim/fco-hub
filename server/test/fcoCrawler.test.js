import test from 'node:test';
import assert from 'node:assert/strict';
import FCOCrawler from '../src/services/fcoCrawler.js';

test('subdomain event landing guidance dates take priority over article dates', async () => {
  class FakeCrawler extends FCOCrawler {
    async getString(url) {
      const pages = {
        'https://fconline.garena.vn/tin-tuc/su-kien/': '<a class="st-news__post" href="https://fconline.garena.vn/event-prefers-guidance-date/">Event</a>',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=2': '',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=3': '',
        'https://fconline.garena.vn/event-prefers-guidance-date/': `
          <html>
            <head><title>WELCOME TO FC ONLINE – Sự kiện subdomain</title></head>
            <body>
              <a href="https://event.fconline.garena.vn/prefer-guidance/">Tham gia ngay</a>
              <p>Thời gian diễn ra: Từ ngày 01.06.2026 đến 30.06.2026</p>
            </body>
          </html>
        `,
        'https://event.fconline.garena.vn/prefer-guidance/': `
          <html>
            <body>
              <button>Hướng dẫn</button>
              <div class="modal">
                <h2>Hướng dẫn</h2>
                <p>Thời gian diễn ra: Từ ngày 01.07.2026 đến 05.07.2026</p>
              </div>
            </body>
          </html>
        `,
      };
      return pages[url] || '';
    }
  }

  const crawler = new FakeCrawler();

  const events = await crawler.getEvents(new Date('2026-07-02T00:00:00.000Z'));

  assert.equal(events.length, 1);
  assert.equal(events[0].dateLabel, '01.07.2026 - 05.07.2026');
  assert.equal(events[0].launchUrl, 'https://event.fconline.garena.vn/prefer-guidance/');
});

test('event landing prefers the broad event date range over shorter phase ranges', async () => {
  const crawler = new FCOCrawler();
  const ranges = crawler.getPreferredEventRanges(crawler.getDateRanges(`
    Hướng dẫn
    Thời gian sự kiện: 10.06 - 21.07.2026
    Giai đoạn 1: 29.06 - 01.07.2026
  `));

  assert.deepEqual(ranges.map((range) => range.label), [
    '10.06.2026 - 21.07.2026',
  ]);
});

test('event landing uses rendered guidance text when static html has no modal date', async () => {
  class FakeCrawler extends FCOCrawler {
    async getString(url) {
      const pages = {
        'https://fconline.garena.vn/tin-tuc/su-kien/': '<a class="st-news__post" href="https://fconline.garena.vn/rendered-guidance-date/">Event</a>',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=2': '',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=3': '',
        'https://fconline.garena.vn/rendered-guidance-date/': `
          <html>
            <head><title>WELCOME TO FC ONLINE – Rendered guidance</title></head>
            <body>
              <a href="https://event.fconline.garena.vn/rendered-guidance/">Tham gia ngay</a>
            </body>
          </html>
        `,
        'https://event.fconline.garena.vn/rendered-guidance/': '<html><body><div id="app"></div></body></html>',
      };
      return pages[url] || '';
    }

    async getRenderedGuidanceText(url) {
      assert.equal(url, 'https://event.fconline.garena.vn/rendered-guidance/');
      return 'Hướng dẫn Thời gian sự kiện: 10.06 - 21.07.2026';
    }
  }

  const crawler = new FakeCrawler();

  const events = await crawler.getEvents(new Date('2026-07-02T00:00:00.000Z'));

  assert.equal(events.length, 1);
  assert.equal(events[0].dateLabel, '10.06.2026 - 21.07.2026');
});

test('event landing dates come from the guidance modal, not other landing page text', async () => {
  class FakeCrawler extends FCOCrawler {
    async getString(url) {
      const pages = {
        'https://fconline.garena.vn/tin-tuc/su-kien/': '<a class="st-news__post" href="https://fconline.garena.vn/event-modal-only-date/">Event</a>',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=2': '',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=3': '',
        'https://fconline.garena.vn/event-modal-only-date/': `
          <html>
            <head><title>WELCOME TO FC ONLINE – Sự kiện modal</title></head>
            <body>
              <a href="https://event.fconline.garena.vn/modal-only/">Tham gia ngay</a>
            </body>
          </html>
        `,
        'https://event.fconline.garena.vn/modal-only/': `
          <html>
            <body>
              <button>Hướng dẫn</button>
              <div class="modal">
                <h2>Hướng dẫn</h2>
                <p>Thời gian: Diễn ra từ 01.07.2026 đến 05.07.2026</p>
              </div>
              <footer>Ưu đãi khác diễn ra từ 01.07.2026 đến 03.07.2026</footer>
            </body>
          </html>
        `,
      };
      return pages[url] || '';
    }
  }

  const crawler = new FakeCrawler();

  const events = await crawler.getEvents(new Date('2026-07-02T00:00:00.000Z'));

  assert.equal(events.length, 1);
  assert.equal(events[0].dateLabel, '01.07.2026 - 05.07.2026');
});

test('event landing guidance content supplies dates when article has no date range', async () => {
  class FakeCrawler extends FCOCrawler {
    async getString(url) {
      const pages = {
        'https://fconline.garena.vn/tin-tuc/su-kien/': '<a class="st-news__post" href="https://fconline.garena.vn/event-with-guidance-date/">Event</a>',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=2': '',
        'https://fconline.garena.vn/tin-tuc/su-kien/?paged=3': '',
        'https://fconline.garena.vn/event-with-guidance-date/': `
          <html>
            <head><title>WELCOME TO FC ONLINE – Sự kiện săn quà</title></head>
            <body>
              <a href="https://event.fconline.garena.vn/guidance-date/">Tham gia ngay</a>
              <p>Chi tiết sự kiện xem tại nút Hướng dẫn.</p>
            </body>
          </html>
        `,
        'https://event.fconline.garena.vn/guidance-date/': `
          <html>
            <body>
              <button>Hướng dẫn</button>
              <div class="modal">
                <h2>Hướng dẫn</h2>
                <p>Thời gian diễn ra: Từ ngày 01.07.2026 đến 05.07.2026</p>
              </div>
            </body>
          </html>
        `,
      };
      return pages[url] || '';
    }
  }

  const crawler = new FakeCrawler();

  const events = await crawler.getEvents(new Date('2026-07-02T00:00:00.000Z'));

  assert.equal(events.length, 1);
  assert.equal(events[0].dateLabel, '01.07.2026 - 05.07.2026');
  assert.equal(events[0].status, 'Active');
});

test('article dates come from timing sections instead of unrelated article text', () => {
  const crawler = new FCOCrawler();
  const text = `
    Ưu đãi phụ từ ngày 01.07.2026 đến 03.07.2026 dành cho một số HLV.

    Thời gian diễn ra:
    Từ ngày 01.07.2026 đến 05.07.2026
  `;

  const ranges = crawler.getDateRanges(crawler.getArticleTimingText(text));

  assert.deepEqual(ranges.map((range) => range.label), [
    '01.07.2026 - 05.07.2026',
  ]);
});

test('date ranges ignore related-news content after the article body', () => {
  const crawler = new FCOCrawler();
  const text = `
    [Nạp tích lũy FC/MC 09.06- 12.06]
    Thời gian diễn ra:
    Bắt đầu: 11h00 ngày 09.06.2026
    Kết thúc: 23h59 ngày 12.06.2026

    CÁC TIN LIÊN QUAN
    01/07/2026
    [Nạp tích lũy FC/MC 01.07- 05.07]
    Trở lại từ ngày 01.07- 05.07 Sự kiện Nạp tích lũy FC/MC...
  `;

  const ranges = crawler.getDateRanges(text);

  assert.deepEqual(ranges.map((range) => range.label), [
    '09.06.2026 - 12.06.2026',
  ]);
});
