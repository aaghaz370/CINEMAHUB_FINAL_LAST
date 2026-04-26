// TheMovieBox End-to-End Extraction Test
const PLAY_COOKIE = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';
const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  'X-Source': 'h5',
  'X-Client-Info': '{"timezone":"Asia/Calcutta"}',
  'Cookie': PLAY_COOKIE,
  'Accept': 'application/json'
};

async function findWorkingEndpoints() {
  console.log('=== Step 1: Finding Working TheMovieBox API Endpoints ===');
  
  // Try to load the home page to get real API calls
  const homeR = await fetch('https://themoviebox.org/', {
    headers: { ...BASE_HEADERS, 'Accept': 'text/html' }
  });
  console.log('Home status:', homeR.status);
  
  const html = await homeR.text();
  
  // Find all wefeed API endpoints
  const apiMatches = html.match(/wefeed-h5api-bff\/[^\s"'<>]+/g) || [];
  const uniqueApis = [...new Set(apiMatches)];
  console.log('Found API paths:', uniqueApis.slice(0, 10));
  
  // Find movie detail slugs from the HTML
  const slugMatches = html.match(/\/movies\/([a-z0-9-]+)/g) || [];
  const uniqueSlugs = [...new Set(slugMatches)];
  console.log('Found movie slugs:', uniqueSlugs.slice(0, 5));
  
  // Find subjectId references
  const idMatches = html.match(/"subjectId"\s*:\s*"([^"]+)"/g) || [];
  console.log('Found subject IDs:', idMatches.slice(0, 3));
  
  return { uniqueApis, uniqueSlugs, idMatches };
}

async function trySearchAPI() {
  console.log('\n=== Step 2: Trying Search API ===');
  
  // Try different search endpoint formats
  const searchUrls = [
    'https://themoviebox.org/wefeed-h5api-bff/subject/search?keyword=pushpa&page=1&size=10',
    'https://themoviebox.org/wefeed-h5api-bff/subject/search?kw=pushpa',
    'https://themoviebox.org/wefeed-h5api-bff/movie/search?keyword=pushpa',
  ];
  
  for (const url of searchUrls) {
    const r = await fetch(url, { headers: BASE_HEADERS });
    console.log(url.split('bff/')[1], '->', r.status);
    if (r.ok) {
      const d = await r.json();
      console.log('SUCCESS:', JSON.stringify(d).slice(0, 500));
      return d;
    }
  }
  return null;
}

async function tryKnownMovie() {
  console.log('\n=== Step 3: Testing Known Movie Detail Page ===');
  
  // Known working URL from previous test
  const knownUrl = 'https://themoviebox.org/movies/bloodhounds-hindi-aFaIWHXTtB6';
  
  const r = await fetch(knownUrl, {
    headers: { ...BASE_HEADERS, 'Accept': 'text/html,application/xhtml+xml' }
  });
  console.log('Detail page status:', r.status, r.headers.get('content-type'));
  
  if (!r.ok) {
    console.log('FAILED - 404/redirect. Real URL might be different.');
    
    // Check where it redirects
    const finalUrl = r.url;
    console.log('Final URL after redirect:', finalUrl);
    return;
  }
  
  const html = await r.text();
  console.log('Page size:', html.length, 'chars');
  
  // Check for NUXT_DATA
  const hasNuxt = html.includes('__NUXT_DATA__');
  console.log('Has NUXT_DATA:', hasNuxt);
  
  // Extract subjectId
  const subjectIdMatch = html.match(/"subjectId"\s*:\s*"([^"]+)"/);
  if (subjectIdMatch) {
    console.log('subjectId found:', subjectIdMatch[1]);
    return subjectIdMatch[1];
  }
  
  // Show first 500 chars of NUXT data if present
  if (hasNuxt) {
    const nuxtMatch = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nuxtMatch) {
      console.log('NUXT_DATA preview:', nuxtMatch[1].slice(0, 300));
    }
  }
}

async function tryPlayAPI(subjectId, slug, season, episode) {
  console.log(`\n=== Step 4: Testing Play API for subjectId=${subjectId} ===`);
  
  const referer = `https://themoviebox.org/movies/${slug}?id=${subjectId}&type=/movie/detail`;
  
  const playUrl = new URL('https://themoviebox.org/wefeed-h5api-bff/subject/play');
  playUrl.searchParams.set('subjectId', subjectId);
  playUrl.searchParams.set('se', String(season));
  playUrl.searchParams.set('ep', String(episode));
  playUrl.searchParams.set('detailPath', slug);
  
  console.log('Play URL:', playUrl.toString());
  
  const r = await fetch(playUrl.toString(), {
    headers: {
      ...BASE_HEADERS,
      'Referer': referer,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    }
  });
  
  console.log('Play API status:', r.status);
  
  if (r.ok) {
    const d = await r.json();
    console.log('\n✅ PLAY API RESPONSE:');
    console.log(JSON.stringify(d, null, 2));
    
    // Try to find stream URL
    const str = JSON.stringify(d);
    const m3u8Match = str.match(/https?:\/\/[^"]*\.m3u8[^"]*/);
    const mp4Match = str.match(/https?:\/\/[^"]*\.mp4[^"]*/);
    
    if (m3u8Match) console.log('\n🎬 M3U8 URL:', m3u8Match[0]);
    if (mp4Match) console.log('\n🎬 MP4 URL:', mp4Match[0]);
    
    return d;
  } else {
    const txt = await r.text();
    console.log('ERROR response:', txt.slice(0, 300));
  }
}

async function main() {
  try {
    const { uniqueSlugs } = await findWorkingEndpoints();
    
    await trySearchAPI();
    
    const subjectId = await tryKnownMovie();
    
    if (subjectId) {
      await tryPlayAPI(subjectId, 'bloodhounds-hindi-aFaIWHXTtB6', 1, 1);
    } else {
      // Try hardcoded IDs from past tests
      console.log('\nTrying hardcoded subjectId from previous Bloodhounds URL...');
      // Known pattern slug usually contains the ID hash
      await tryPlayAPI('aFaIWHXTtB6', 'bloodhounds-hindi-aFaIWHXTtB6', 1, 1);
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
