// Comprehensive Stability Test - All Providers
// Tests speed, link quality, and response format
const BASE = 'http://localhost:9090';

const MEDIA_PROVIDERS = [
  { name: 'themovie',     type: 'stream',    test: testTheMovie },
  { name: 'netmirror',   type: 'stream',    test: testNetMirror },
  { name: 'castel',      type: 'stream',    test: testCastel },
  { name: 'animesalt',   type: 'stream',    test: testAnimeSalt },
  { name: 'drive',       type: 'download',  test: testDrive },
  { name: 'hdhub4u',     type: 'download',  test: testHdhub4u },
  { name: '4khdhub',     type: 'download',  test: testKhdhub },
  { name: 'modlist',     type: 'download',  test: testModlist },
  { name: 'desiremovies',type: 'download',  test: testDesiremovies },
  { name: 'uhdmovies',   type: 'download',  test: testUhdmovies },
  { name: 'kmmovies',    type: 'download',  test: testKmmovies },
  { name: 'zinkmovies',  type: 'download',  test: testZinkmovies },
  { name: 'zeefliz',     type: 'download',  test: testZeefliz },
  { name: 'animepahe',   type: 'stream',    test: testAnimepahe },
];

const results = [];

function formatTime(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms/1000).toFixed(1) + 's';
}

async function fetchJSON(url, timeout = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return await r.json();
  } catch(e) {
    clearTimeout(timer);
    return { error: e.message };
  }
}

// ---- Provider Tests ----

async function testTheMovie() {
  const home = await fetchJSON(`${BASE}/api/themovie`);
  if (!home.success || !home.movies?.length) return { error: 'No home movies' };
  const movie = home.movies[0];
  const url = movie.fullUrl || movie.href;
  if (!url) return { error: 'No movie URL' };
  
  const det = await fetchJSON(`${BASE}/api/themovie/det?url=${encodeURIComponent(url)}`);
  if (!det.success) return { error: det.error || 'Det failed' };
  
  const streams = det.watchOnline?.streams || [];
  if (!streams.length) return { error: 'No streams' };
  
  return {
    title: det.meta?.title,
    links: streams.map(s => ({ quality: s.resolutions + 'p', url: s.url, format: s.format || 'MP4' })),
    langs: det.meta?.dubs?.map(d => d.name) || [],
  };
}

async function testNetMirror() {
  const home = await fetchJSON(`${BASE}/api/netmirror?action=home`);
  if (!home.success || !home.data?.items?.length) return { error: 'No home items' };
  const item = home.data.items[0];
  
  const stream = await fetchJSON(`${BASE}/api/netmirror?action=stream&id=${item.id}`);
  if (!stream.success) return { error: stream.message || 'Stream failed' };
  
  const sources = stream.data?.streamData?.[0]?.sources || [];
  if (!sources.length) return { error: 'No sources' };
  
  return {
    title: item.title,
    links: sources.map(s => ({ quality: s.label || 'HD', url: s.file, format: 'M3U8' })),
    langs: ['Multi'],
  };
}

async function testCastel() {
  // Castel needs TMDB ID - use a known one (Pushpa 2: 1084736)
  const r = await fetchJSON(`${BASE}/api/castel?id=1084736&type=movie`);
  if (!r.success) return { error: r.error || 'Castel failed' };
  if (!r.streams?.length) return { error: 'No streams' };
  return {
    title: 'Pushpa 2 (Castel)',
    links: r.streams.map(s => ({ quality: s.quality, url: s.url, format: 'MP4' })),
    langs: [...new Set(r.streams.map(s => s.name.match(/\[([^\]]+)\]/)?.[1] || 'Unknown'))],
  };
}

async function testAnimeSalt() {
  const home = await fetchJSON(`${BASE}/api/animesalt?action=home`);
  if (!home.success) return { error: home.message || 'Home failed' };
  const series = home.data?.popularSeries?.[0] || home.data?.popularMovies?.[0];
  if (!series) return { error: 'No series' };
  
  const det = await fetchJSON(`${BASE}/api/animesalt?action=details&url=${encodeURIComponent(series.url)}`);
  if (!det.success) return { error: 'Details failed' };
  const ep = det.data?.seasons?.[0]?.episodes?.[0];
  if (!ep) return { error: 'No episodes' };
  
  const str = await fetchJSON(`${BASE}/api/animesalt?action=stream&url=${encodeURIComponent(ep.url)}`);
  if (!str.success || !str.data?.proxiedM3u8) return { error: 'No m3u8' };
  
  return {
    title: series.title || series.name,
    links: [{ quality: 'Auto', url: str.data.proxiedM3u8, format: 'M3U8' }],
    langs: ['Japanese'],
  };
}

async function testDrive() {
  const home = await fetchJSON(`${BASE}/api/drive?page=1`);
  if (!home.success || !home.movies?.length) return { error: 'No movies' };
  const movie = home.movies[0];
  
  const det = await fetchJSON(`${BASE}/api/drive/details?url=${encodeURIComponent(movie.url)}`);
  if (!det.success) return { error: 'Details failed' };
  
  const links = det.data?.downloadLinks || [];
  const firstLink = Object.values(links).flat()[0];
  if (!firstLink) return { error: 'No links' };
  
  return {
    title: movie.title,
    links: [{ quality: firstLink.quality || 'Unknown', url: firstLink.serverUrl || firstLink.url, format: 'BYPASS' }],
    langs: ['Hindi', 'English'],
    requiresBypass: true,
  };
}

async function testHdhub4u() {
  const search = await fetchJSON(`${BASE}/api/hdhub4u/search?q=pushpa`);
  const movies = search.data?.results || search.results || [];
  if (!movies.length) return { error: 'No results' };
  
  const det = await fetchJSON(`${BASE}/api/hdhub4u/details?url=${encodeURIComponent(movies[0].url)}`);
  if (!det.success) return { error: 'Details failed' };
  
  const dlLinks = det.data?.downloadLinks || [];
  if (!dlLinks.length) return { error: 'No dl links' };
  
  return {
    title: movies[0].title,
    links: dlLinks.slice(0,3).map(l => ({ quality: l.quality || l.type, url: l.url || l.link, format: 'BYPASS' })),
    requiresBypass: true,
  };
}

async function testKhdhub() {
  const r = await fetchJSON(`${BASE}/api/4khdhub/search?q=movie`);
  const movies = r.data?.results || r.results || r.data || [];
  if (!movies?.length) return { error: 'No results' };
  const det = await fetchJSON(`${BASE}/api/4khdhub/details?url=${encodeURIComponent(movies[0].url)}`);
  if (!det.success) return { error: 'Details failed' };
  const links = det.data?.downloadLinks || [];
  return {
    title: movies[0].title,
    links: links.slice(0,2).map(l => ({ quality: l.quality, url: l.url, format: 'BYPASS' })),
    requiresBypass: true,
  };
}

async function testModlist() {
  const r = await fetchJSON(`${BASE}/api/modlist/moviesmod/search?q=pushpa`);
  const movies = r.movies || r.results || [];
  if (!movies.length) return { error: 'No results' };
  const det = await fetchJSON(`${BASE}/api/modlist/moviesmod/details?url=${encodeURIComponent(movies[0].url)}`);
  const links = det.data?.downloadLinks?.[0]?.links || det.downloadLinks || [];
  return {
    title: movies[0].title,
    links: links.slice(0,2).map(l => ({ quality: l.quality || l.server, url: l.url || l.link || l.serverUrl, format: 'BYPASS' })),
    requiresBypass: true,
  };
}

async function testDesiremovies() {
  const r = await fetchJSON(`${BASE}/api/desiremovies?action=home`);
  const movies = r.data?.movies || r.movies || [];
  if (!movies.length) return { error: 'No movies' };
  return {
    title: movies[0]?.title || 'Unknown',
    links: [{ quality: 'Unknown', url: movies[0]?.url, format: 'BYPASS' }],
    requiresBypass: true,
  };
}

async function testUhdmovies() {
  const r = await fetchJSON(`${BASE}/api/uhdmovies?page=1`);
  const movies = r.data?.recentMovies || r.movies || r.data || [];
  if (!movies?.length) return { error: 'No movies' };
  return {
    title: movies[0]?.title || 'Unknown',
    links: [{ quality: '4K', url: movies[0]?.url, format: 'BYPASS' }],
    requiresBypass: true,
  };
}

async function testKmmovies() {
  const r = await fetchJSON(`${BASE}/api/kmmovies?page=1`);
  const movies = r.data?.recentMovies || r.movies || r.data || [];
  if (!movies?.length) return { error: 'No movies' };
  return {
    title: movies[0]?.title || 'Unknown',
    links: [{ quality: 'Unknown', url: movies[0]?.url, format: 'BYPASS' }],
    requiresBypass: true,
  };
}

async function testZinkmovies() {
  const r = await fetchJSON(`${BASE}/api/zinkmovies?page=1`);
  const movies = r.data?.recentMovies || r.movies || r.results || r.data || [];
  if (!movies?.length) return { error: 'No movies' };
  return {
    title: movies[0]?.title || 'Unknown', links: [], requiresBypass: true,
  };
}

async function testZeefliz() {
  const r = await fetchJSON(`${BASE}/api/zeefliz?page=1`);
  const movies = r.data?.recentMovies || r.movies || r.data || [];
  if (!movies?.length) return { error: 'No movies' };
  return {
    title: movies[0]?.title || 'Unknown', links: [], requiresBypass: true,
  };
}

async function testAnimepahe() {
  const r = await fetchJSON(`${BASE}/api/animepahe?action=home`);
  const items = r.data?.items || r.items || r.data || [];
  if (!items?.length) return { error: 'No items' };
  return {
    title: items[0]?.title || 'Unknown', links: [], langs: ['Japanese'],
  };
}

// ---- Main Runner ----
async function runAll() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         SCRAPER API STABILITY TEST - ALL PROVIDERS           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  for (const provider of MEDIA_PROVIDERS) {
    const start = Date.now();
    process.stdout.write(`Testing [${provider.name.padEnd(14)}] (${provider.type}) ... `);
    
    let result;
    try {
      result = await provider.test();
    } catch(e) {
      result = { error: e.message };
    }
    
    const elapsed = Date.now() - start;
    
    if (result.error) {
      console.log(`❌ FAIL  [${formatTime(elapsed)}] → ${result.error}`);
      results.push({ name: provider.name, type: provider.type, status: 'FAIL', error: result.error, elapsed });
    } else {
      const linkCount = result.links?.length || 0;
      const hasRealUrl = result.links?.some(l => l.url && (l.url.includes('.mp4') || l.url.includes('.m3u8') || l.url.startsWith('http')));
      const needsBypass = result.requiresBypass ? ' [needs bypass]' : '';
      console.log(`✅ OK    [${formatTime(elapsed)}] → "${result.title?.slice(0,30)}" | ${linkCount} links${needsBypass}`);
      if (result.links?.length) {
        result.links.slice(0,2).forEach(l => {
          if (l.url) console.log(`         → [${l.quality}] ${l.format}: ${l.url.slice(0,80)}...`);
        });
      }
      if (result.langs?.length) console.log(`         → Langs: ${result.langs.join(', ')}`);
      results.push({ name: provider.name, type: provider.type, status: 'OK', result, elapsed });
    }
    console.log();
  }
  
  // Summary
  const ok = results.filter(r => r.status === 'OK').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const avgTime = Math.round(results.reduce((a, r) => a + r.elapsed, 0) / results.length);
  
  console.log('════════════════════════════════════════════════');
  console.log(`SUMMARY: ${ok}/${MEDIA_PROVIDERS.length} providers OK | ${fail} failed | Avg time: ${formatTime(avgTime)}`);
  console.log('════════════════════════════════════════════════');
  console.log('Failed:', results.filter(r => r.status === 'FAIL').map(r => `${r.name} (${r.error})`).join(', ') || 'None');
  console.log('Stream providers (no bypass needed):', results.filter(r => r.status === 'OK' && r.type === 'stream').map(r => r.name).join(', '));
  console.log('Download providers (bypass needed):', results.filter(r => r.status === 'OK' && r.type === 'download').map(r => r.name).join(', '));
}

runAll();
