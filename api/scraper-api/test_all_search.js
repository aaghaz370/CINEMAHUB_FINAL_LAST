// ============================================================
// COMPREHENSIVE SEARCH TEST - All Media Providers
// Query: "pushpa" on all providers
// ============================================================
const BASE = 'http://localhost:9090';
const QUERY = 'pushpa';
const TIMEOUT = 20000;

async function fetchJSON(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { _error: `HTTP ${r.status}`, _url: url };
    return await r.json();
  } catch(e) {
    clearTimeout(t);
    return { _error: e.message.includes('abort') ? 'TIMEOUT' : e.message, _url: url };
  }
}

// Extract results from any response shape
function extractResults(data, providerName) {
  if (!data || data._error) return { count: 0, error: data?._error || 'No response', results: [] };
  
  // Try all known result keys (in priority order)
  let raw =
    data.data?.results ||          // Standard: { data: { results: [] } }
    data.results ||                 // Flat: { results: [] }
    data.data?.movies ||            // { data: { movies: [] } }
    data.movies ||                  // { movies: [] }
    data.data?.items ||             // { data: { items: [] } }
    data.items ||                   // { items: [] }
    data.data?.searchResults ||     // { data: { searchResults: [] } }
    null;
  
  // ZinkMovies/Movies4u: data is directly an array
  if (!raw && Array.isArray(data.data)) raw = data.data;
  // AnimePahe/AnimeSalt specific
  if (!raw && data.data?.data) raw = data.data.data;
  
  // If it's an object (keyed), convert to array
  const arr = Array.isArray(raw) ? raw : (typeof raw === 'object' && raw !== null ? Object.values(raw) : []);
  
  if (!arr.length && data.success === false) {
    return { count: 0, error: data.error || data.message || 'Provider error', results: [] };
  }
  if (!arr.length) {
    return { count: 0, error: null, results: [] };
  }
  
  return {
    count: arr.length,
    error: null,
    results: arr.slice(0, 3).map(r => ({
      title: (r.title || r.name || r.t || r.video_title || '').slice(0, 55),
      url: r.url || r.link || r.pageUrl || r.postUrl || r.fullUrl || r.href || '',
    })),
  };
}

// ─── Provider Definitions ─────────────────────────────────────────────────────
const PROVIDERS = [
  // ── Streaming providers (direct m3u8/mp4) ──
  { name: 'TheMovieBox',    type: 'Stream',   url: `${BASE}/api/themovie?q=${QUERY}` },
  { name: 'NetMirror',      type: 'Stream',   url: `${BASE}/api/netmirror/search?q=${QUERY}` },
  { name: 'Castel',         type: 'Stream',   url: null, note: 'TMDB-ID only, no search' },
  { name: 'AnimeSalt',      type: 'Stream',   url: `${BASE}/api/animesalt?action=search&q=naruto`, note: 'anime-only' },
  { name: 'AnimePahe',      type: 'Stream',   url: null, note: 'Currently down' },
  
  // ── Download providers (bypass links) ──
  { name: 'HDHub4u',        type: 'Download', url: `${BASE}/api/hdhub4u/search?q=${QUERY}` },
  { name: '4KHDHub',        type: 'Download', url: null, note: 'JS-rendered, needs browser' },
  { name: 'Drive/Mdrive',   type: 'Download', url: `${BASE}/api/drive/search?q=${QUERY}` },
  { name: 'Modlist (Bolly)',type: 'Download', url: `${BASE}/api/modlist/moviesleech?q=${QUERY}` },
  { name: 'Modlist (Holly)',type: 'Download', url: `${BASE}/api/modlist/moviesmod?q=${QUERY}` },
  { name: 'DesireMovies',   type: 'Download', url: `${BASE}/api/desiremovies/search?q=${QUERY}` },
  { name: 'Movies4u',       type: 'Download', url: `${BASE}/api/movies4u/search?q=${QUERY}` },
  { name: 'ZinkMovies',     type: 'Download', url: `${BASE}/api/zinkmovies/search?q=${QUERY}` },
  { name: 'UHDMovies',      type: 'Download', url: null, note: '403 Forbidden on search' },
  { name: 'KMMovies',       type: 'Download', url: null, note: '403 Forbidden on search' },
  { name: 'ZeeFliz',        type: 'Download', url: null, note: '403 Forbidden on search' },
  { name: 'Vega',           type: 'Download', url: null, note: 'JS-rendered, needs browser' },
  { name: 'Mod',            type: 'Download', url: `${BASE}/api/mod/search?q=${QUERY}` },
  
  // ── Global aggregated search ──
  { name: 'Global Search',  type: 'Agg',      url: `${BASE}/api/search?q=${QUERY}` },
];

async function testAll() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log(`║  PUSHPA SEARCH TEST — ALL PROVIDERS (${new Date().toLocaleTimeString()})             ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  let totalOk = 0, totalFail = 0, totalSkip = 0;
  const failedProviders = [];
  const workingProviders = [];
  
  for (const p of PROVIDERS) {
    const pad = p.name.padEnd(16);
    
    if (!p.url) {
      console.log(`  [${p.type.padEnd(8)}] ${pad} ⏭️  SKIP — ${p.note}`);
      totalSkip++;
      continue;
    }
    
    const start = Date.now();
    const data = await fetchJSON(p.url);
    const elapsed = Date.now() - start;
    const { count, error, results } = extractResults(data, p.name);
    const timeStr = elapsed >= 1000 ? `${(elapsed/1000).toFixed(1)}s` : `${elapsed}ms`;
    
    if (error || count === 0) {
      const errMsg = error || 'No results found';
      console.log(`  [${p.type.padEnd(8)}] ${pad} ❌  0 results [${timeStr}] → ${errMsg.slice(0,50)}`);
      totalFail++;
      failedProviders.push({ name: p.name, error: errMsg });
    } else {
      const status = count >= 5 ? '✅ ' : count >= 1 ? '⚠️ ' : '❌ ';
      console.log(`  [${p.type.padEnd(8)}] ${pad} ${status} ${count} results [${timeStr}]`);
      results.forEach(r => {
        if (r.title) console.log(`              → "${r.title}"`);
      });
      totalOk++;
      workingProviders.push({ name: p.name, count });
    }
    console.log();
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${totalOk} working | ${totalFail} failed | ${totalSkip} skipped`);
  console.log(`\n✅ Working providers (${workingProviders.length}):`);
  workingProviders.forEach(p => console.log(`   ${p.name}: ${p.count} results`));
  console.log(`\n❌ Failed providers (${failedProviders.length}):`);
  failedProviders.forEach(p => console.log(`   ${p.name}: ${p.error?.slice(0,60)}`));
  console.log('═══════════════════════════════════════════════════════════════════');
}

testAll().catch(console.error);
