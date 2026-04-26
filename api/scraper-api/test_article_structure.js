const cheerio = require('cheerio');

async function inspectArticle() {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const r = await fetch('https://moviesmod.farm/search/avengers', {
    headers: { 'User-Agent': UA, 'Referer': 'https://moviesmod.farm/' },
    signal: AbortSignal.timeout(12000)
  });
  const html = await r.text();
  const $ = cheerio.load(html);
  
  console.log('Total articles:', $('article').length);
  
  $('article').first().find('*').each((_, el) => {
    const tag = $(el).prop('tagName').toLowerCase();
    const cls = $(el).attr('class') || '';
    const txt = $(el).text().trim().slice(0,60);
    const href = $(el).attr('href') || '';
    const src = $(el).attr('src') || '';
    
    if (href || src || txt.length > 3) {
      console.log(`  <${tag}> class="${cls.slice(0,40)}" href="${href.slice(0,60)}" src="${src.slice(0,60)}" text="${txt}"`);
    }
  });
}
inspectArticle().catch(console.error);
