// Test what domains drive/desiremovies/moviesmod use via getBaseUrl
async function main() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  // 1. Test providers JSON to find correct keys
  const pj = await fetch('https://raw.githubusercontent.com/Anshu78780/json/main/providers.json').then(r=>r.json());
  const keys = ['drive', 'Drive', 'mdrive', 'Mdrive', 'DesiReMovies', 'desiremovies', 'movies4u', 'Movies4u', 'zinkmovies', 'ZinkMovies', 'Moviesmod', 'moviebox'];
  console.log('Provider keys found:');
  keys.forEach(k => { if (pj[k]) console.log(' ', k, '->', pj[k].url); });
  
  // 2. Check which of these work with /?s=pushpa
  const toTest = [
    ['Drive', pj.drive?.url || pj.Mdrive?.url || 'https://movies4u.tv'],
    ['DesiReMovies', pj.DesiReMovies?.url || 'https://1desiremovies.mov'],
    ['Movies4u', pj.movies4u?.url || pj.Movies4u?.url || 'https://movies4u.tv'],
    ['ZinkMovies', pj.zinkmovies?.url || pj.ZinkMovies?.url || 'https://zinzmovies.com'],
    ['Moviesmod', pj.Moviesmod?.url || 'https://moviesmod.farm'],
  ];
  console.log('\nSearchable test (/?s=pushpa):');
  for (const [name, base] of toTest) {
    if (!base) { console.log(name, 'NO URL'); continue; }
    try {
      const r = await fetch(base + '/?s=pushpa', { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, signal: AbortSignal.timeout(10000) });
      const html = await r.text();
      const arts = html.split('<article').length - 1;
      console.log(name.padEnd(15), r.status, r.url.slice(0,65), '| articles:', arts);
    } catch(e) { console.log(name.padEnd(15), 'ERROR:', e.message.slice(0,40)); }
  }
}
main().catch(console.error);
