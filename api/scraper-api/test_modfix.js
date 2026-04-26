// Test actual working domains and HTML structure for failing providers
async function main() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // 1. Test moviesmod.farm search (Hollywood site - test with avengers)
  console.log('=== moviesmod.farm search ===');
  try {
    const r = await fetch('https://moviesmod.farm/?s=avengers', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://moviesmod.farm/' },
      signal: AbortSignal.timeout(12000)
    });
    const html = await r.text();
    const arts = html.split('<article').length - 1;
    console.log('status:', r.status, '| articles:', arts);
    // Check article structure
    if (arts > 0) {
      const firstArt = html.match(/<article[\s\S]*?<\/article>/)?.[0] || '';
      const href = firstArt.match(/href="([^"]+)"/)?.[1];
      const titleMatch = firstArt.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/);
      console.log('  href:', href?.slice(0,70), '| title:', titleMatch?.[1]?.slice(0,50));
    }
  } catch(e) { console.log('Error:', e.message); }

  // 2. Test moviesleech.link alternatives
  console.log('\n=== moviesleech.link alternatives ===');
  const leechDomains = [
    'https://moviesleech.link/?s=pushpa',
    'https://moviesleech.net/?s=pushpa',
    'https://moviesleech.pro/?s=pushpa',
  ];
  for (const url of leechDomains) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      console.log(url.split('//')[1].split('/')[0], '->', r.status, r.url);
    } catch(e) { console.log(url.split('//')[1].split('/')[0], '-> ERROR:', e.message.slice(0,40)); }
  }

  // 3. Test Mod search with /?s= format
  console.log('\n=== mod search with /?s= ===');
  try {
    const r = await fetch('https://moviesmod.farm/?s=avengers', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://moviesmod.farm/' },
      signal: AbortSignal.timeout(12000)
    });
    const html = await r.text();
    const arts = html.split('<article').length - 1;
    const latestPosts = html.split('latestPost').length - 1;
    const imgSrc = html.match(/src="([^"]+\.(?:jpg|webp|jpeg|png))"/)?.[1];
    console.log('status:', r.status, '| articles:', arts, '| latestPost:', latestPosts, '| img:', imgSrc?.slice(0,60));
  } catch(e) { console.log('Error:', e.message); }

  // 4. Find Bolly site from providers JSON
  console.log('\n=== Check all providers for Bolly ===');
  const pRes = await fetch('https://raw.githubusercontent.com/Anshu78780/json/main/providers.json');
  const providers = await pRes.json();
  const bollyKeys = Object.entries(providers).filter(([k,v]) => 
    k.toLowerCase().includes('bolly') || k.toLowerCase().includes('leech') || 
    k.toLowerCase().includes('top') || v.url.includes('bollywood') ||
    v.url.includes('leech')
  );
  console.log('Bolly-related providers:', bollyKeys);
}
main().catch(console.error);
