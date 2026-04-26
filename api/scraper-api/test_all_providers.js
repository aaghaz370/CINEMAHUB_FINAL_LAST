// ============================================================
// CINEMAHUB — Full Provider Test with correct endpoints
// Query: batman | Checks: results, quality, language, streams
// ============================================================
const BASE = 'http://localhost:9090';
const QUERY = 'batman';
const Q = encodeURIComponent(QUERY);

// ✅ Confirmed working endpoints (with correct search params)
const PROVIDERS = [
  { name: 'MovieBox',     url: `${BASE}/api/themovie?q=${Q}`,                type: 'themovie' },
  { name: 'HDHub4u',      url: `${BASE}/api/hdhub4u?s=${Q}`,                 type: 'hdhub4u' },
  { name: '4KHDHub',      url: `${BASE}/api/4khdhub?s=${Q}`,                 type: '4khdhub' },
  { name: 'ZeeFliz',      url: `${BASE}/api/zeefliz?q=${Q}`,                 type: 'zeefliz' },
  { name: 'Mod',          url: `${BASE}/api/mod?q=${Q}`,                     type: 'mod' },
  { name: 'UHDMovies',    url: `${BASE}/api/uhdmovies?q=${Q}`,               type: 'generic' },
  { name: 'DesireMovies', url: `${BASE}/api/desiremovies?q=${Q}`,            type: 'generic' },
  { name: 'Movies4u',     url: `${BASE}/api/movies4u?q=${Q}`,                type: 'generic' },
  { name: 'ZinkMovies',   url: `${BASE}/api/zinkmovies/search?q=${Q}`,       type: 'generic' },
  { name: 'NetMirror',    url: `${BASE}/api/netmirror?action=search&q=${Q}`, type: 'netmirror' },
  { name: 'VegaMovies',   url: `${BASE}/api/vega?s=${Q}`,                    type: 'generic' }, // may be down
  { name: 'KMMovies',     url: `${BASE}/api/kmmovies?q=${Q}`,                type: 'generic' }, // forbidden
  { name: 'AnimeSalt',    url: `${BASE}/api/animesalt?q=${Q}`,               type: 'generic' },
];

// ============================================================
// Quality + Language detection from full JSON response
// ============================================================
function detectQuality(str) {
  const s = str.toLowerCase();
  const q = [];
  if (s.match(/\b4k\b|2160p|uhd/)) q.push('4K');
  if (s.match(/1080p|full.?hd|fhd/)) q.push('1080p');
  if (s.match(/720p|mid.?hd/)) q.push('720p');
  if (s.match(/480p/)) q.push('480p');
  if (s.match(/360p/)) q.push('360p');
  return q.length ? q : ['N/A'];
}

function detectLanguage(str) {
  const s = str.toLowerCase();
  const l = [];
  if (s.includes('hindi')) l.push('Hindi');
  if (s.includes('english')) l.push('English');
  if (s.includes('tamil')) l.push('Tamil');
  if (s.includes('telugu')) l.push('Telugu');
  if (s.includes('malayalam')) l.push('Malayalam');
  if (s.includes('multi')) l.push('Multi');
  if (s.includes('dubbed')) l.push('Dubbed');
  return l.length ? l : ['—'];
}

// ============================================================
// Extract items from different response formats
// ============================================================
function extractItems(data, type) {
  try {
    switch(type) {
      case 'themovie':  return data?.movies || [];
      case 'hdhub4u':   return data?.data?.recentMovies || data?.data?.results || [];
      case '4khdhub':   return data?.results || data?.data || [];
      case 'zeefliz':   return data?.results || data?.data || [];
      case 'mod':       return data?.results || data?.data || [];
      case 'netmirror': return data?.data?.searchResults?.searchResult || [];
      default:
        // Try common patterns
        for (const key of ['results', 'data', 'movies', 'items', 'posts', 'searchResult']) {
          if (Array.isArray(data?.[key]) && data[key].length > 0) return data[key];
          if (Array.isArray(data?.data?.[key]) && data.data[key].length > 0) return data.data[key];
        }
        return [];
    }
  } catch { return []; }
}

function getTitle(item) {
  return item?.title || item?.name || item?.t || item?.post_title || 
         item?.slug?.replace(/-/g,' ') || 'Untitled';
}

// ============================================================
// Main test runner
// ============================================================
async function testProvider(p) {
  const start = Date.now();
  try {
    const r = await fetch(p.url, { signal: AbortSignal.timeout(30000) });
    const elapsed = Date.now() - start;
    const j = await r.json();
    const raw = JSON.stringify(j);
    const items = extractItems(j, p.type);
    const quality = detectQuality(raw);
    const language = detectLanguage(raw);

    return {
      name: p.name,
      ok: items.length > 0,
      count: items.length,
      time: elapsed,
      quality,
      language,
      samples: items.slice(0, 3).map(getTitle),
      error: j.success === false ? j.error : null
    };
  } catch(e) {
    return {
      name: p.name,
      ok: false,
      count: 0,
      time: Date.now() - start,
      quality: [],
      language: [],
      samples: [],
      error: e.name === 'AbortError' ? 'TIMEOUT (30s)' : e.message
    };
  }
}

async function main() {
  console.log('\n' + '═'.repeat(75));
  console.log(`🎬  CINEMAHUB — ALL PROVIDERS TEST`);
  console.log(`🔍  Search Query: "${QUERY.toUpperCase()}"`);
  console.log('═'.repeat(75) + '\n');
  
  const results = await Promise.all(PROVIDERS.map(testProvider));
  
  const working = results.filter(r => r.ok);
  const empty   = results.filter(r => !r.ok && !r.error);
  const failed  = results.filter(r => !r.ok && r.error);

  // ✅ Working providers
  console.log('✅  WORKING PROVIDERS\n' + '─'.repeat(75));
  for (const r of working) {
    console.log(`\n  📦 ${r.name.padEnd(14)} | ${r.count} results | ${r.time}ms`);
    console.log(`     📺  Quality  : ${r.quality.join(' + ')}`);
    console.log(`     🌐  Language : ${r.language.join(' + ')}`);
    console.log(`     🎬  Samples  :`);
    r.samples.forEach((s, i) => console.log(`          ${i+1}. ${s.substring(0,80)}`));
  }

  // ⚠️ Empty/blocked
  if (empty.length > 0 || failed.length > 0) {
    console.log('\n\n⚠️  ISSUES\n' + '─'.repeat(75));
    for (const r of [...empty, ...failed]) {
      const icon = r.error ? '❌' : '⚠️ ';
      console.log(`  ${icon} ${r.name.padEnd(14)} | ${r.time}ms | ${r.error || 'No results for this query'}`);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(75));
  console.log(`📊  SUMMARY:`);
  console.log(`   ✅  Working  : ${working.length} providers`);
  console.log(`   ❌  Failed   : ${failed.length} providers`);
  console.log(`   ⚠️   No results: ${empty.length} providers`);
  console.log(`   📋  Total    : ${PROVIDERS.length} providers tested`);
  console.log('═'.repeat(75) + '\n');
}

main();
