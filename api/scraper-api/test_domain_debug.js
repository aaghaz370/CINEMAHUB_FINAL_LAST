// Direct domain test - check what moviesmod.farm actually serves
async function main() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  
  // Test 1: moviesmod.farm home - what domain does it redirect to?
  console.log('=== moviesmod.farm redirect chain ===');
  try {
    const r = await fetch('https://moviesmod.farm/', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    console.log('Status:', r.status, 'Final URL:', r.url);
    const html = await r.text();
    const arts = html.split('<article').length - 1;
    console.log('Articles:', arts, 'HTML size:', html.length);
    if (arts > 0) {
      // Find first article title
      const titleMatch = html.match(/class="title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      console.log('First title:', titleMatch?.[2]?.slice(0,60), '| URL:', titleMatch?.[1]?.slice(0,70));
    }
  } catch(e) { console.log('Error:', e.message); }

  // Test 2: moviesmod.farm search  
  console.log('\n=== moviesmod.farm search avengers ===');
  try {
    const r = await fetch('https://moviesmod.farm/?s=avengers', { headers: { 'User-Agent': UA, 'Referer': 'https://moviesmod.farm/' }, signal: AbortSignal.timeout(10000) });
    console.log('Status:', r.status, 'Final URL:', r.url);
    const html = await r.text();
    const arts = html.split('<article').length - 1;
    console.log('Articles:', arts);
    // Find first article link
    const linkM = html.match(/<article[\s\S]*?href="(https?:\/\/[^"]+)"[\s\S]*?<\/article>/);
    console.log('First href:', linkM?.[1]?.slice(0,70));
  } catch(e) { console.log('Error:', e.message); }
  
  // Test 3: moviesdrive.world for bollywood
  console.log('\n=== moviesdrive.world search pushpa ===');
  const bollyDomains = ['https://moviesdrive.world', 'https://new2.moviesdrives.my', 'https://moviesdrive.link'];
  for (const domain of bollyDomains) {
    try {
      const r = await fetch(`${domain}/?s=pushpa`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
      const html = await r.text();
      const arts = html.split('<article').length - 1;
      console.log(domain.split('//')[1].split('/')[0], '->', r.status, r.url.slice(0,60), '| articles:', arts);
      if (arts > 0) break;
    } catch(e) { console.log(domain.split('//')[1].split('/')[0], '-> Error:', e.message.slice(0,40)); }
  }
  
  // Test 4: modlist.in to get current domains
  console.log('\n=== modlist.in link scraping ===');
  try {
    const r = await fetch('https://modlist.in/', { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    const html = await r.text();
    const linkMatches = html.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/g) || [];
    linkMatches.forEach(m => {
      if (m.includes('http') && !m.includes('modlist.in') && !m.includes('#')) {
        const parts = m.match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/);
        if (parts) console.log('  Link:', parts[1].slice(0,60), '| Text:', parts[2].trim());
      }
    });
  } catch(e) { console.log('Error:', e.message); }
}
main().catch(console.error);
