// Direct test each provider's search via API
async function test() {
  const tests = [
    ['ZinkMovies',  'http://localhost:9090/api/zinkmovies/search?q=pushpa'],
    ['Movies4u',    'http://localhost:9090/api/movies4u/search?q=pushpa'],
    ['KMMovies',    'http://localhost:9090/api/kmmovies/search?q=pushpa'],
    ['Vega',        'http://localhost:9090/api/vega/search?q=pushpa'],
    ['4KHDHub',     'http://localhost:9090/api/4khdhub/search?q=pushpa'],
    ['UHDMovies',   'http://localhost:9090/api/uhdmovies/search?q=pushpa'],
    ['Modlist-L',   'http://localhost:9090/api/modlist/moviesleech/search?q=pushpa'],
    ['Modlist-L2',  'http://localhost:9090/api/modlist/moviesleech?q=pushpa'],
    ['Animesalt',   'http://localhost:9090/api/animesalt/search?q=pushpa'],
    ['TheMovie-s',  'http://localhost:9090/api/themovie/search?q=pushpa'],
    ['TheMovie-main','http://localhost:9090/api/themovie?q=pushpa'],
  ];
  
  for (const [name, url] of tests) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const text = await r.text();
      let d;
      try { d = JSON.parse(text); } catch(e) { console.log(name.padEnd(16), r.status, 'INVALID JSON:', text.slice(0,80)); continue; }
      
      const count = d.data?.results?.length || d.results?.length || d.movies?.length || 
                    d.data?.length || d.data?.movies?.length || d.data?.totalResults || 0;
      const err = d.error || d.message || '';
      
      if (count > 0) {
        const sample = (d.data?.results || d.results || d.movies || d.data || [])[0];
        const title = sample?.title || sample?.name || JSON.stringify(sample).slice(0,50);
        console.log(name.padEnd(16), '✅', count, 'results | First:', title.slice(0,50));
      } else {
        console.log(name.padEnd(16), '❌', r.status, '| err:', String(err).slice(0,60));
        // Show raw response snippet
        console.log('  raw:', JSON.stringify(d).slice(0,120));
      }
    } catch(e) {
      console.log(name.padEnd(16), 'FAIL:', e.message.slice(0,60));
    }
  }
}
test().catch(console.error);
