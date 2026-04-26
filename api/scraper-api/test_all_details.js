const BASE = 'http://localhost:9090';
const QUERY = 'batman';

// Endpoint definitions for Search -> Details -> Stream flow
const PROVIDERS = [
  { 
    name: 'MovieBox', 
    search: `/api/themovie?q=${QUERY}`, 
    item: d => d?.movies?.[0], 
    urlExt: i => i.href,
    detBase: '/api/themovie/det?url=',
    streamBase: '/api/themovie/stream?url=' 
  },
  { 
    name: 'HDHub4u', 
    search: `/api/hdhub4u?s=${QUERY}`, 
    item: d => (d?.data?.recentMovies || d?.data?.results)?.[0], 
    urlExt: i => i.url,
    detBase: '/api/hdhub4u/details?url=',
  },
  { 
    name: 'ZeeFliz', 
    search: `/api/zeefliz?q=${QUERY}`, 
    item: d => d?.data?.[0] || d?.results?.[0], 
    urlExt: i => i.url || i.link,
    detBase: '/api/zeefliz/details?url=',
  },
  { 
    name: 'UHDMovies', 
    search: `/api/uhdmovies?q=${QUERY}`, 
    item: d => d?.data?.[0] || d?.results?.[0], 
    urlExt: i => i.url || i.link,
    detBase: '/api/uhdmovies/details?url=',
  },
  { 
    name: 'DesireMovies', 
    search: `/api/desiremovies?q=${QUERY}`, 
    item: d => d?.data?.[0] || d?.results?.[0], 
    urlExt: i => i.url || i.link,
    detBase: '/api/desiremovies/details?url=',
  },
  { 
    name: 'Mod', 
    search: `/api/mod?q=${QUERY}`, 
    item: d => d?.data?.[0] || d?.results?.[0], 
    urlExt: i => i.url || i.link,
    detBase: '/api/mod/details?url=',
  }
];

function detectQualities(text) {
  const s = String(text).toLowerCase();
  const q = new Set();
  if (s.match(/4k|2160p|uhd/)) q.add('4K');
  if (s.match(/1080p|fhd/)) q.add('1080p');
  if (s.match(/720p/)) q.add('720p');
  if (s.match(/480p/)) q.add('480p');
  return q.size ? Array.from(q).join(' | ') : 'Unknown HD';
}

function extractDownloadLinks(data) {
    if (!data) return [];
    let links = [];
    const walk = (obj) => {
        if (!obj) return;
        if (typeof obj === 'string') {
            if (obj.startsWith('http') && (obj.includes('drive') || obj.includes('link') || obj.includes('download') || obj.includes('.mp4') || obj.includes('.mkv'))) {
                links.push(obj);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach(walk);
        } else if (typeof obj === 'object') {
            if (obj.title && obj.link) links.push(`${obj.title} - ${obj.link}`);
            if (obj.name && obj.url) links.push(`${obj.name} - ${obj.url}`);
            if (obj.url) links.push(obj.url);
            if (obj.link) links.push(obj.link);
            Object.values(obj).forEach(walk);
        }
    };
    walk(data);
    return Array.from(new Set(links)).filter(l => l.startsWith('http')).slice(0, 5); // max 5 sample links
}

async function runTest() {
  console.log('\n'+'='.repeat(80));
  console.log(`🚀 DEEP EXTRACTION TEST: Search -> Details -> Streams`);
  console.log('='.repeat(80)+'\n');

  for (const p of PROVIDERS) {
    console.log(`\n📦 PROVIDER: ${p.name}`);
    try {
      // 1. SEARCH
      const sRes = await fetch(BASE + p.search, { signal: AbortSignal.timeout(10000) });
      const sData = await sRes.json();
      const item = p.item(sData);
      
      if (!item) {
        console.log(`   ❌ Search Empty`);
        continue;
      }
      
      const title = item.title || item.name || item.t || 'Unknown Title';
      const itemUrl = p.urlExt(item);
      console.log(`   ✅ Best Match: "${title}"`);
      
      if (!itemUrl) {
        console.log(`   ❌ No URL found in item!`);
        continue;
      }

      // 2. DETAILS
      const detUrl = BASE + p.detBase + encodeURIComponent(itemUrl);
      console.log(`   🔍 Details API: ${p.detBase}...`);
      const dRes = await fetch(detUrl, { signal: AbortSignal.timeout(15000) });
      const dData = await dRes.json();
      
      if (dData.success === false) {
        console.log(`   ❌ Details Failed: ${dData.error?.substring(0,50)}`);
        continue;
      }

      console.log(`   🎬 Qualities Extracted: ${detectQualities(JSON.stringify(dData))}`);
      
      // Look for episodes/seasons/links
      const links = extractDownloadLinks(dData);
      if (links.length) {
          console.log(`   🔗 Content Links Found (${links.length} samples):`);
          links.forEach(l => console.log(`      - ${l.substring(0, 90)}`));
      } else {
          console.log(`   ⚠️ No direct link metadata found in details response.`);
      }

      // 3. STREAM (Optional/MovieBox specific)
      if (p.streamBase) {
          const streamUrl = BASE + p.streamBase + encodeURIComponent(itemUrl);
          console.log(`   ▶️ Stream API: ${p.streamBase}...`);
          const stRes = await fetch(streamUrl, { signal: AbortSignal.timeout(15000) });
          const stData = await stRes.json();
          if (stData.success === false) {
              console.log(`      ❌ Stream Failed: ${stData.error?.substring(0,50)}`);
          } else {
              const streamLinks = extractDownloadLinks(stData);
              console.log(`      ✅ Available Streams: ${detectQualities(JSON.stringify(stData))}`);
              streamLinks.forEach(l => console.log(`         - ${l.substring(0, 90)}`));
          }
      }

    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }
  
  console.log('\n'+'='.repeat(80)+'\n');
}

runTest();
