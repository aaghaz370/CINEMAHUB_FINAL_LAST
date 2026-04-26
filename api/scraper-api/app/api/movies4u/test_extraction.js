const BASE = 'http://localhost:3333'; // assuming we run ScarperApi on 3333

async function log(msg) {
    console.log('[MOVIES4U Test] ' + msg);
}

async function testProvider() {
    try {
      log('1. Fetching latest movies/search...');
      let res = await fetch(`${BASE}/api/movies4u?page=1`).catch(() => null);
      if (!res || !res.ok) {
          log('Failed to fetch from /api/movies4u. Status: ' + (res?.status || 'Unknown'));
          return;
      }
      const dataText = await res.text();
      let data;
      try { data = JSON.parse(dataText); } catch(e) { log('API failed to return JSON'); return; }

      let items = data.data?.recentMovies || data.data?.results || data.results || data.data || data.movies || data.searchResult || data.data?.searchResults?.searchResult;
      if (data.result && data.result.data) items = data.result.data;

      if (!Array.isArray(items)) {
          if (typeof items === 'object' && items !== null) items = Object.values(items);
          else items = [];
      }

      if (!items || items.length === 0) {
          log('No movies found');
          return;
      }

      const firstItem = items[0];
      const itemUrl = firstItem.url || firstItem.link || firstItem.href || (firstItem.session ? 'session=' + firstItem.session : null);
      
      if (!itemUrl && !firstItem.id) {
          log('Could not find URL or ID for item: ' + (firstItem.title || firstItem.name || 'Unknown'));
          return;
      }
      
      log(`Selected item: ${firstItem.title || firstItem.name || firstItem.t || 'Unknown'}`);

      log('2. Fetching details...');
      let detailQuery = '';
      if (itemUrl && itemUrl.startsWith('session=')) detailQuery = `?${itemUrl}`;
      else if (itemUrl) detailQuery = `?url=${encodeURIComponent(itemUrl)}`;
      else if (firstItem.id) detailQuery = `?id=${firstItem.id}`;

      let detailsRes = await fetch(`${BASE}/api/movies4u/details${detailQuery}`).catch(() => null);
      if (!detailsRes || !detailsRes.ok) {
          log('Failed to fetch details or no details endpoint exists.');
          return;
      }
      const detText = await detailsRes.text();
      let detailsData;
      try { detailsData = JSON.parse(detText); } catch(e) { log('Details endpoint failed to return JSON'); return; }
      
      let links = detailsData.data?.downloadLinks || detailsData.data?.episodes || detailsData.data?.quality_options || detailsData.data?.streams || detailsData.data?.files || [];
      if (!links || (Array.isArray(links) && links.length === 0)) {
          log('No download links found in details.');
          return;
      }

      log(`Found potential link objects: ${Array.isArray(links) ? links.length : 1}. Checking extraction...`);
      
      let extPath = `${BASE}/api/movies4u/extractor`;
      log('3. Trying extractor endpoint if available...');
      
      let linkToExtract = null;
      // Dive deep to find the first string URL
      if (Array.isArray(links)) {
         if (links[0].links && Array.isArray(links[0].links) && links[0].links.length > 0) linkToExtract = links[0].links[0].url;
         else linkToExtract = links[0].url || links[0].link;
      } else {
         linkToExtract = Object.values(links)[0];
      }

      if(!linkToExtract || typeof linkToExtract !== 'string') {
         log('Could not parse a string URL to extract.');
         return;
      }
      log(`Target Extractor URL: ${linkToExtract}`);

      let extRes = await fetch(`${extPath}?url=${encodeURIComponent(linkToExtract)}`).catch(() => null);
      if (extRes && extRes.ok) {
         const extText = await extRes.text();
         try {
           const extData = JSON.parse(extText);
           log('SUCCESS! Extracted: ' + JSON.stringify(extData).substring(0,300));
         } catch(e) { log('Extractor returned non-JSON'); }
      } else {
         log('FAILED to extract or extractor endpoint not found (404). Details link was: ' + linkToExtract);
      }
    } catch(e) {
        log('Error in test script: ' + e);
    }
}

testProvider();
