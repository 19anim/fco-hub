// Test: How many pages does FIFAAddict API have in total?
const axios = require('axios');

const BASE_URL = 'https://vn.fifaaddict.com';

async function getAraiwaToken() {
  const key = Math.random().toString(16).substring(2, 34);
  try {
    const resp = await axios.get(`${BASE_URL}/api2?rq=araiwa&t=${key}`, {
      timeout: 10000,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return {
      token: resp.data.trim(),
      cookie: resp.headers['set-cookie']?.map(c => c.split(';')[0]).join('; ') || ''
    };
  } catch (err) {
    console.error('Token fetch failed:', err.response?.status, err.message);
    return null;
  }
}

async function testPagination() {
  console.log('=== Testing FIFAAddict API Pagination ===\n');

  const auth = await getAraiwaToken();
  if (!auth) {
    console.log('Cannot proceed without token');
    return;
  }

  console.log('Token obtained\n');

  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-ARAIWA': auth.token,
    'Cookie': auth.cookie,
    'Referer': `${BASE_URL}/fo4db`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  const seenUids = new Set();
  let consecutiveEmpty = 0;
  let consecutiveDuplicate = 0;

  // Test pages 1, 10, 50, 100, 200, 500, 1000
  const testPages = [1, 10, 50, 100, 200, 500, 1000];

  for (const page of testPages) {
    try {
      const url = `${BASE_URL}/api2?q=fo4db&page=${page}&order=ovr&locale=vn`;
      const resp = await axios.get(url, { timeout: 10000, headers });
      const rows = resp.data?.db || [];

      if (!rows.length) {
        console.log(`Page ${page}: EMPTY - likely beyond max page`);
        break;
      }

      // Check for new UIDs
      let newInPage = 0;
      for (const row of rows) {
        const key = `${row.uid}-${row.year}`;
        if (!seenUids.has(key)) {
          seenUids.add(key);
          newInPage++;
        }
      }

      console.log(`Page ${page}: ${rows.length} rows, ${newInPage} new unique cards, total: ${seenUids.size}`);

      // Sample first 3
      if (page === 1) {
        console.log('  Sample:');
        rows.slice(0, 3).forEach(r => {
          console.log(`    - ${r.name} (${r.year_short}, OVR ${r.attrB})`);
        });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (err) {
      console.log(`Page ${page}: ERROR - ${err.response?.status} ${err.message}`);
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('  Token expired or rate limited');
        break;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total unique cards found: ${seenUids.size}`);
  console.log(`Tested up to page: ${testPages[testPages.length - 1]}`);
}

testPagination().catch(err => console.error('Fatal:', err.message));
