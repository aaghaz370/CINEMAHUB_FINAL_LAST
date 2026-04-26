const fs = require('fs');

async function test() {
  const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };
  const id = '82006666';
  
  // Step 1: Get intermediate hash
  const step1Res = await fetch('https://net22.cc/play.php', {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://net22.cc/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: `id=${id}`,
  });

  const step1Data = await step1Res.json();
  const intermediateH = step1Data.h;
  console.log('Step 1 Hash:', intermediateH);

  // Step 2
  const step2Url = `https://net52.cc/play.php?id=${id}&${intermediateH}`;
  const step2Res = await fetch(step2Url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'Referer': 'https://net22.cc/',
      'Host': 'net52.cc'
    },
  });

  const step2Html = await step2Res.text();
  const match = step2Html.match(/data-h="([^"]+)"/);
  console.log('Step 2 data-h:', match ? match[1] : 'NOT FOUND');
  if(!match) console.log('Step 2 HTML:', step2Html.substring(0, 500));
}
test();
