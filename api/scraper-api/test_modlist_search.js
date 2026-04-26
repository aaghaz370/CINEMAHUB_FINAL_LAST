// Test modlist search URL format
async function main() {
  const urls = [
    'https://moviesmod.farm/page/1/?s=pushpa',
    'https://moviesmod.farm/?s=pushpa',
  ];
  for (const url of urls) {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000)
    });
    console.log(url.split('.farm')[1], '->', r.status, r.url);
    const html = await r.text();
    // bookmarks
    const bookmarks = html.match(/ href="(https:\/\/moviesmod[^"]+)" (rel|title)=/g) || [];
    console.log('Bookmarks:', bookmarks.length);
    // article count
    const arts = html.split('<article').length - 1;
    console.log('Articles:', arts);
    if (arts > 0) {
      // find h2 titles
      const h2s = html.match(/<h2[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/h2>/g) || [];
      console.log('H2s:', h2s.length, h2s[0] ? h2s[0].slice(0, 100) : '');
      break;
    }
  }
}
main().catch(console.error);
