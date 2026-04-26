const PLAY_COOKIE = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';

async function test() {
  console.log('Fetching movie detail page...');
  const r = await fetch('https://themoviebox.org/movies/bloodhounds-hindi-aFaIWHXTtB6', {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36', 
      'Cookie': PLAY_COOKIE,
      'Accept': 'text/html'
    }
  });
  console.log('Status:', r.status);
  const html = await r.text();
  
  // Extract NUXT_DATA script
  const nuxtMatch = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) { console.log('No NUXT_DATA found'); return; }
  
  const raw = JSON.parse(nuxtMatch[1]);
  console.log('Total NUXT entries:', raw.length);
  
  // Find objects with subjectId
  let subjectId = null;
  let subjectType = null;
  let detailPath = null;
  let title = null;
  
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
      if ('subjectId' in item) {
        const sid = raw[item.subjectId];
        console.log(`[${i}] subjectId ref -> ${item.subjectId} -> value: ${sid}`);
        if (typeof sid === 'string' || typeof sid === 'number') subjectId = sid;
      }
      if ('subjectType' in item) {
        subjectType = raw[item.subjectType];
        console.log(`[${i}] subjectType:`, subjectType);
      }
      if ('detailPath' in item) {
        detailPath = raw[item.detailPath];
        console.log(`[${i}] detailPath:`, detailPath);
      }
      if ('title' in item) {
        const t = raw[item.title];
        if (typeof t === 'string' && t.length > 1) {
          title = t;
        }
      }
    }
  }
  
  console.log('\n===== Extracted =====');
  console.log('subjectId:', subjectId);
  console.log('subjectType:', subjectType, '(1=movie, 2=TV)');
  console.log('detailPath:', detailPath);
  console.log('title:', title);
  
  if (!subjectId) {
    // Try to find it as a raw value in specific positions
    console.log('\nSearching numeric IDs in raw array...');
    for (let i = 0; i < Math.min(raw.length, 100); i++) {
      if (typeof raw[i] === 'string' && /^\d{8,}$/.test(raw[i])) {
        console.log(`raw[${i}] = "${raw[i]}" (looks like a numeric ID)`);
      }
    }
    return;
  }
  
  // Step 2: Call play API
  console.log('\n=== Calling Play API ===');
  const isTV = subjectType === 2;
  const se = isTV ? 1 : 0;
  const ep = isTV ? 1 : 0;
  const dp = detailPath || 'bloodhounds-hindi-aFaIWHXTtB6';
  
  const playUrl = `https://themoviebox.org/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${dp}`;
  const referer = `https://themoviebox.org/movies/${dp}?id=${subjectId}&type=${isTV ? '/tv/detail' : '/movie/detail'}`;
  
  console.log('Play URL:', playUrl);
  
  const pr = await fetch(playUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
      'Cookie': PLAY_COOKIE,
      'X-Source': 'h5',
      'X-Client-Info': '{"timezone":"Asia/Calcutta"}',
      'Accept': 'application/json',
      'Referer': referer,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    }
  });
  
  console.log('Play API status:', pr.status);
  const pd = await pr.json();
  console.log('\n✅ PLAY RESPONSE:');
  console.log(JSON.stringify(pd, null, 2));
  
  // Find m3u8/mp4 anywhere in response
  const str = JSON.stringify(pd);
  const m3u8 = str.match(/https?:\/\/[^"\\]*\.m3u8[^"\\]*/);
  const mp4 = str.match(/https?:\/\/[^"\\]*\.mp4[^"\\]*/);
  
  if (m3u8) console.log('\n🎬 FOUND M3U8:', m3u8[0]);
  if (mp4) console.log('\n🎬 FOUND MP4:', mp4[0]);
  
  // Find "url" fields
  const urlFields = str.match(/"url"\s*:\s*"([^"]+)"/g);
  if (urlFields) console.log('\n📎 URL fields:', urlFields.slice(0,5));
}

test().catch(console.error);
