const PLAY_COOKIE = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';

async function test() {
  // Known from NUXT_DATA parsing
  const subjectId = '5543197340762262336';
  const detailPath = 'bloodhounds-hindi-aFaIWHXTtB6';
  const isTV = true; // subjectType = 2
  
  // Try different season/episode combos
  const combos = [
    { se: 1, ep: 1 },
    { se: 0, ep: 0 },
    { se: 1, ep: 1, asMovie: true },
  ];
  
  for (const combo of combos) {
    const playUrl = `https://themoviebox.org/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${combo.se}&ep=${combo.ep}&detailPath=${detailPath}`;
    const referer = `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/tv/detail`;
    
    console.log(`Testing se=${combo.se} ep=${combo.ep}...`);
    
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
        'Sec-Ch-Ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
        'Sec-Ch-Ua-Mobile': '?1',
        'Sec-Ch-Ua-Platform': '"Android"',
        'Sec-Gpc': '1',
        'Priority': 'u=1, i',
      }
    });
    
    console.log('  Status:', pr.status);
    const pd = await pr.json();
    
    if (pd.code !== 0) {
      console.log('  ERROR:', pd.message || pd.reason || JSON.stringify(pd));
      continue;
    }
    
    console.log('\n✅ SUCCESS! Full response:');
    console.log(JSON.stringify(pd, null, 2));
    
    const str = JSON.stringify(pd);
    const m3u8 = str.match(/https?:\/\/[^"\\]*\.m3u8[^"\\]*/g);
    const mp4 = str.match(/https?:\/\/[^"\\]*\.mp4[^"\\]*/g);
    const urlF = str.match(/"url"\s*:\s*"(https?:\/\/[^"]+)"/g);
    
    if (m3u8) console.log('\n🎬 M3U8 URLs found:', m3u8);
    if (mp4) console.log('\n🎬 MP4 URLs found:', mp4);
    if (urlF) console.log('\n🔗 URL fields:', urlF);
    break;
  }
}

test().catch(console.error);
