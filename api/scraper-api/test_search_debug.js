// Debug search issues for all 3 providers
async function main() {
  // 1. HDHub4u - check what search page looks like
  console.log('=== HDHub4u Search Debug ===');
  const hdS = await fetch('http://localhost:9090/api/hdhub4u?action=search&q=pushpa');
  const hdD = await hdS.json();
  console.log('Result:', hdD.success, 'results:', hdD.data?.results?.length, 'error:', hdD.error);
  
  // Direct test
  const hdR = await fetch('https://new6.hdhub4u.fo/?s=pushpa', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(10000)
  });
  console.log('Direct search status:', hdR.status, hdR.url);
  const hdHtml = await hdR.text();
  // Check what HTML elements contain movies
  const articles = hdHtml.match(/<article[^>]*>/g) || [];
  console.log('Articles found:', articles.length);
  const h2s = hdHtml.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h2>/g) || [];
  console.log('H2 titles:', h2s.length, h2s.slice(0,2));
  
  // pattern for hdhub search results
  const aLinks = hdHtml.match(/href="(https:\/\/new6\.hdhub4u\.fo\/[^"]+\/)"[^>]*>([\s\S]*?)<\/a>/g) || [];
  console.log('Article links found:', aLinks.length, aLinks.slice(0,2));
  
  // 2. Modlist search debug  
  console.log('\n=== Modlist Search Debug ===');
  const modR = await fetch('https://moviesmod.farm/?s=pushpa', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000)
  });
  console.log('Modlist search status:', modR.status, modR.url);
  const modHtml = await modR.text();
  const modArticles = modHtml.match(/<article[^>]*>/g) || [];
  console.log('Articles:', modArticles.length);
  const modLinks = modHtml.match(/href="(https:\/\/moviesmod[^"]*\/[^"]+\/)"[^>]*title="([^"]+)"/g) || [];
  console.log('Post links:', modLinks.length, modLinks.slice(0,3));
  
  // 3. TheMovieBox search workaround
  console.log('\n=== TheMovieBox Search Alternative ===');
  // Try different search endpoints
  const tmEndpoints = [
    'https://themoviebox.org/wefeed-h5api-bff/subject/search?keyword=pushpa&pageSize=10&lang=en',
    'https://themoviebox.org/wefeed-h5api-bff/subject/query?keyword=pushpa&pageSize=10',
    'https://themoviebox.org/wefeed-h5api-bff/home/search?keyword=pushpa',
    'https://themoviebox.org/wefeed-h5api-bff/subject?keyword=pushpa',
  ];
  const cookie = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';
  for (const ep of tmEndpoints) {
    const r = await fetch(ep, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36', 'X-Source': 'h5', 'Cookie': cookie, 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
    console.log(ep.split('bff/')[1].slice(0,40), '->', r.status);
    if (r.ok) {
      const d = await r.json();
      console.log('  Response:', JSON.stringify(d).slice(0,200));
      break;
    }
  }
}
main().catch(console.error);
