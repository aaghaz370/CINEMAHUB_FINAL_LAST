// Check live domains from providers.json and test which search actually works
async function main() {
  // Get all provider base URLs
  const pRes = await fetch('https://raw.githubusercontent.com/Anshu78780/json/main/providers.json');
  const providers = await pRes.json();
  
  console.log('=== ALL PROVIDER KEYS & URLS ===');
  Object.entries(providers).forEach(([k,v]) => console.log(k.padEnd(20), v.url));
  
  console.log('\n=== TESTING SEARCH ON EACH PROVIDER ===');
  
  // Test the ones that are failing
  const toTest = [
    ['4kHDHub', providers['4kHDHub']?.url],
    ['zinkmovies', providers['zinkmovies']?.url],
    ['UhdMovies', providers['UhdMovies']?.url],
    ['movies4u', providers['movies4u']?.url],
    ['kmmovies', providers['kmmovies']?.url],
    ['vega', providers['vega']?.url],
    ['nfMirror', providers['nfMirror']?.url],
    ['moviesleech', providers['moviesleech']?.url],
  ];
  
  for (const [name, baseUrl] of toTest) {
    if (!baseUrl) { console.log(name, '-> NO URL IN PROVIDERS.JSON'); continue; }
    
    const searchUrl = `${baseUrl}/?s=pushpa`;
    try {
      const r = await fetch(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(12000)
      });
      const html = await r.text();
      const arts = html.split('<article').length - 1;
      const items = html.split('result-item').length - 1;
      const posts = html.split('gridlove-post').length - 1;
      const movieCards = html.split('movie-card').length - 1;
      console.log(name.padEnd(16), r.status, r.url.slice(0,60));
      console.log('  articles:', arts, '| result-items:', items, '| gridlove-posts:', posts, '| movie-cards:', movieCards);
    } catch(e) {
      console.log(name.padEnd(16), 'ERROR:', e.message.slice(0,60));
    }
  }
}
main().catch(console.error);
