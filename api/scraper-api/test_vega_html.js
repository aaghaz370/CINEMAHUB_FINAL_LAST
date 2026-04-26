// Test Vega actual content structure
async function main() {
  // Vega redirects to vegamovies.market 
  const r = await fetch('https://vegamovies.market/search.html?q=pushpa', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(12000)
  });
  const html = await r.text();
  console.log('Size:', html.length, 'Finalurl:', r.url);
  
  // Find all "post" elements
  const postMatches = html.match(/class="[^"]*post[^"]*"/g) || [];
  console.log('Post class elements:', postMatches.length, postMatches.slice(0,5));
  
  // Find any links with movie titles
  const linkMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]{5,60})<\/a>/g) || [];
  console.log('Links found:', linkMatches.length);
  linkMatches.slice(0,10).forEach(m => {
    const clean = m.replace(/<[^>]+>/g, '').trim();
    if (clean.length > 3) console.log('  ', clean.slice(0,60));
  });
  
  // Try getting the actual article elements
  const bodyIndex = html.indexOf('<body');
  const bodySnippet = html.slice(bodyIndex, bodyIndex + 3000);
  console.log('\nBody snippet:', bodySnippet.slice(0, 800));
}
main().catch(console.error);
