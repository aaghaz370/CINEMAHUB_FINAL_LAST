// Test HDHub4u with correct domain
async function main() {
  // Use API search which works  
  const searchRes = await fetch('http://localhost:9090/api/hdhub4u/search?q=pushpa');
  const searchData = await searchRes.json();
  const movie = searchData.data?.results?.[0];
  console.log('Movie URL (from API):', movie?.url);
  
  if (!movie?.url) { console.log('No movie found'); return; }
  
  // Now fetch the actual page directly  
  const realUrl = movie.url.replace('new4.hdhub4u.fo', 'new6.hdhub4u.fo');
  console.log('Trying URL:', realUrl);
  
  const r = await fetch(realUrl, { 
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Referer': 'https://new6.hdhub4u.fo/'
    },
    signal: AbortSignal.timeout(15000)
  });
  console.log('Status:', r.status, 'Final URL:', r.url);
  const html = await r.text();
  
  // Test different link patterns
  // Pattern 1: h3/h4/h5 with links inside
  const headingLinks = [];
  const h345 = html.match(/<h[345][^>]*>[\s\S]*?<\/h[345]>/g) || [];
  console.log('\nH3/H4/H5 tags found:', h345.length);
  for (const h of h345.slice(0, 5)) {
    const aMatch = h.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/);
    if (aMatch) headingLinks.push({ heading: h.replace(/<[^>]+>/g, '').trim().slice(0, 60), url: aMatch[1] });
  }
  console.log('Sample heading links:', headingLinks.slice(0, 5));
  
  // Pattern 2: direct links
  const allLinks = [];
  const linkRe = /<a[^>]+href=["'](https?:\/\/(?!hdhub4u|4khdhub|wp-)[^"']+)["'][^>]*>([\s\S]{3,80}?)<\/a>/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const t = m[2].replace(/<[^>]+>/g, '').trim();
    if (t && !t.match(/^(home|about|contact|privacy|admin|watch online|telegram|category)/i)) {
      allLinks.push({ text: t.slice(0, 60), url: m[1].slice(0, 100) });
    }
  }
  const unique = allLinks.filter((v, i, a) => a.findIndex(x => x.url === v.url) === i);
  console.log('\nAll download links found:', unique.length);
  unique.slice(0, 10).forEach(l => console.log('  [', l.text, '] ->', l.url));
}
main().catch(console.error);
