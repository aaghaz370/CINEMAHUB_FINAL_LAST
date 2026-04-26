// Test Vega + check actual HTML structure for failing providers
async function testVega() {
  const r = await fetch('https://vegamovies.vodka/?s=pushpa', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(12000)
  });
  console.log('Vega status:', r.status, r.url);
  const html = await r.text();
  
  // Test different selectors
  const entryList = html.split('entry-list-item').length - 1;
  const archiveContainer = html.split('archive-container').length - 1;
  const articleCount = html.split('<article').length - 1;
  const postCount = html.split('class="post').length - 1;
  console.log('entry-list-item:', entryList, '| archive-container:', archiveContainer, '| articles:', articleCount, '| posts:', postCount);
  
  // Find actual content structure
  const h2s = html.match(/<h2[^>]*class="[^"]*"[^>]*><a href="([^"]+)"[^>]*>([^<]+)<\/a>/g) || [];
  console.log('H2 links:', h2s.length, h2s.slice(0,3));
  
  // Find article links
  const aLinks = html.match(/href="(https:\/\/vegamovies[^"]+)"[^>]*title="([^"]+)"/g) || [];
  console.log('Article hrefs:', aLinks.length, aLinks.slice(0,3));
}

async function testMoviesBox() {
  console.log('\n=== TheMovieBox search via API ===');
  const r = await fetch('http://localhost:9090/api/themovie?q=pushpa');
  const d = await r.json();
  console.log('Results:', d.results?.length, 'Error:', d.error);
  d.results?.slice(0,3).forEach(r => console.log(' ', r.title, '| url:', r.watchUrl?.slice(0,60)));
}

async function test4KHDHub() {
  console.log('\n=== 4KHDHub HTML structure ===');
  const r = await fetch('https://4khdhub.click/?s=pushpa', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(12000)
  });
  console.log('Status:', r.status, r.url);
  const html = await r.text();
  const articles = html.split('<article').length - 1;
  const movieCards = html.split('movie-card').length - 1;
  const posts = html.split('class="post').length - 1;
  const aHrefs = html.match(/href="(https:\/\/4khdhub[^"]+)"/g) || [];
  console.log('articles:', articles, '| movie-cards:', movieCards, '| posts:', posts);
  console.log('Internal hrefs:', aHrefs.length, aHrefs.slice(0,3));
  
  // Check if JS-rendered (no actual article content in HTML)
  if (articles === 0) {
    const bodySize = html.length;
    const noScript = html.includes('noscript') || html.includes('JavaScript');
    console.log('HTML size:', bodySize, '| JS-rendered:', noScript);
    // Grep for any movie title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    console.log('Page title:', titleMatch?.[1]);
  }
}

async function main() {
  await testVega();
  await testMoviesBox();
  await test4KHDHub();
}
main().catch(console.error);
