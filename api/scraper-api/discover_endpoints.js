// Discover correct endpoint params for each provider
const BASE = 'http://localhost:9090';

const TESTS = [
  ['/api/hdhub4u/search?q=batman'],
  ['/api/hdhub4u?s=batman'],
  ['/api/zinkmovies/search?q=batman'],
  ['/api/zinkmovies?s=batman'],
  ['/api/uhdmovies?q=batman'],
  ['/api/uhdmovies?s=batman'],
  ['/api/uhdmovies/search?q=batman'],
  ['/api/desiremovies?q=batman'],
  ['/api/desiremovies?s=batman'],
  ['/api/desiremovies/search?q=batman'],
  ['/api/castel?q=batman'],
  ['/api/castel?s=batman'],
  ['/api/castel/search?q=batman'],
  ['/api/movies4u?q=batman'],
  ['/api/movies4u?s=batman'],
  ['/api/movies4u/search?q=batman'],
  ['/api/vega?s=batman'],
  ['/api/vega/search?q=batman'],
  ['/api/4khdhub?s=batman'],
  ['/api/4khdhub/search?q=batman'],
];

async function run() {
  console.log('\n=== ENDPOINT DISCOVERY ===\n');
  for (const [ep] of TESTS) {
    try {
      const r = await fetch(BASE + ep, { signal: AbortSignal.timeout(25000) });
      const j = await r.json();
      const s = JSON.stringify(j);
      const titleCount = (s.match(/"title"/g) || []).length;
      const hasErr = j.success === false;
      const icon = titleCount > 0 ? '✅' : (hasErr ? '❌' : '⚠️');
      const err = hasErr ? ` ERR: ${(j.error || '').substring(0, 40)}` : '';
      console.log(`${icon} ${ep.padEnd(42)} titles:${titleCount}${err}`);
    } catch(e) {
      const msg = e.name === 'AbortError' ? 'TIMEOUT' : e.message.substring(0, 30);
      console.log(`❌ ${ep.padEnd(42)} ${msg}`);
    }
  }
  console.log('\n=== DONE ===\n');
}

run();
