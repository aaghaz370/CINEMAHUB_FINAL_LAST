const testProviders = async () => {
    const port = 9090;
    const base = 'http://localhost:' + port;
    const results = {};

    const q = 'pushpa';
    // MoviesMod expects something from Hollywood
    const hwQ = 'avengers';
    const aQ = 'naruto';

    // Helper to log and store result
    const report = (provider, type, streams, desc) => {
        results[provider] = { type, streams, desc };
        console.log(`[PASS] [${provider}] ${type} - Streams: ${streams} | ${desc}`);
    };

    const fail = (provider, error) => {
        results[provider] = { type: 'Failed', error };
        console.log(`[FAIL] [${provider}] Failed: ${error}`);
    };

    console.log('Testing Providers Deep Extraction...');

    // 1. TheMovieBox 
    try {
        const sRes = await fetch(`${base}/api/themovie?action=search&q=${q}`);
        const sJ = await sRes.json();
        const url = sJ.results?.[0]?.watchUrl;
        if(url) {
            const dRes = await fetch(`${base}/api/themovie?action=details&url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const streams = dJ.watchOnline?.streams?.length || 0;
            const first = dJ.watchOnline?.streams?.[0];
            report('TheMovieBox', 'Stream', streams, streams ? `${first.format} ${first.quality}` : 'No streams');
        } else fail('TheMovieBox', 'No search results');
    } catch(e) { fail('TheMovieBox', e.message) }

    // 2. NetMirror
    try {
        const sRes = await fetch(`${base}/api/netmirror/search?q=${q}`);
        const sJ = await sRes.json();
        const url = sJ.results?.[0]?.url;
        if(url) {
            const dRes = await fetch(`${base}/api/netmirror?url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const streams = dJ.data?.streams?.length || 0;
            const format = dJ.data?.streams?.[0]?.format || 'UNKNOWN';
            report('NetMirror', 'Stream', streams, streams ? `${format} M3U8 available` : 'No streams');
        } else fail('NetMirror', 'No search results');
    } catch(e) { fail('NetMirror', e.message) }

    // 3. AnimeSalt
    try {
        const sRes = await fetch(`${base}/api/animesalt?action=search&q=${aQ}`);
        const sJ = await sRes.json();
        const id = sJ.results?.[0]?.id;
        if(id) {
            const dRes = await fetch(`${base}/api/animesalt?action=details&id=${id}`);
            const dJ = await dRes.json();
            const ep = dJ.data?.episodes?.[0]?.number;
            if(ep) {
                const epRes = await fetch(`${base}/api/animesalt?action=stream&id=${id}&ep=${ep}`);
                const epJ = await epRes.json();
                const streams = epJ.data?.streams?.length || 0;
                report('AnimeSalt', 'Stream', streams, streams ? 'M3U8 / MP4 available' : 'No streams');
            } else fail('AnimeSalt', 'No episodes found');
        } else fail('AnimeSalt', 'No search results');
    } catch(e) { fail('AnimeSalt', e.message) }

    // 4. HDHub4u
    try {
        const sRes = await fetch(`${base}/api/hdhub4u/search?q=${q}`);
        const sJ = await sRes.json();
        const url = sJ.data?.results?.[0]?.url;
        if(url) {
             const dRes = await fetch(`${base}/api/hdhub4u?url=${encodeURIComponent(url)}`);
             const dJ = await dRes.json();
             const dls = dJ.data?.downloadLinks?.length || 0;
             const streams = dJ.data?.streamLinks?.length || 0;
             report('HDHub4u', 'Download/Stream', streams, `DL Groups: ${dls}, Direct Streams: ${streams}`);
        } else fail('HDHub4u', 'No search results');
    } catch(e) { fail('HDHub4u', e.message) }

    // 5. Drive
    try {
        const sRes = await fetch(`${base}/api/drive/search?q=${q}`);
        const sJ = await sRes.json();
        const resultsArray = sJ.data?.results || sJ.movies;
        const url = resultsArray?.[0]?.url;
        if(url) {
            const dRes = await fetch(`${base}/api/drive/details?url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const dls = Object.values(dJ.data?.downloadLinks || {}).flat().length;
            report('Drive', 'Download', 0, `DL Links: ${dls}`);
        } else fail('Drive', 'No search results');
    } catch(e) { fail('Drive', e.message) }
    
    // 6. MoviesMod (/api/mod)
    try {
        const sRes = await fetch(`${base}/api/mod?q=${hwQ}`);
        const sJ = await sRes.json();
        const url = sJ.data?.[0]?.url;
        if(url) {
            const dRes = await fetch(`${base}/api/mod?action=details&url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const dls = dJ.data?.downloadGroups?.length || 0;
            const streams = dJ.data?.streamLinks?.length || 0;
            report('MoviesMod', 'Download', streams, `DL Groups: ${dls}, DL servers available`);
        } else fail('MoviesMod', 'No search results');
    } catch(e) { fail('MoviesMod', e.message) }

    // 7. Modlist (MoviesMod instance)
    try {
        const sRes = await fetch(`${base}/api/modlist/moviesmod?q=${hwQ}`);
        const sJ = await sRes.json();
        // Since modlist aggregates, array might easily change structure
        const url = sJ.data?.results?.[0]?.url || sJ.data?.[0]?.url;
        if(url) {
            const dRes = await fetch(`${base}/api/modlist/moviesmod?action=details&url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const dls = dJ.data?.downloadGroups?.length || 0;
            report('Modlist', 'Download', 0, `DL Groups: ${dls}`);
        } else fail('Modlist', 'No search results');
    } catch(e) { fail('Modlist', e.message) }

    // 8. Castel (No search, TMDB ID only. Pushpa: 690369 or Avengers: 24428)
    try {
        const dRes = await fetch(`${base}/api/castel?type=movie&id=690369`);
        const dJ = await dRes.json();
        if (dJ.success && dJ.data?.streams?.length > 0) {
            report('Castel', 'Stream', dJ.data.streams.length, `M3U8 Streams available`);
        } else fail('Castel', 'Failed or no streams');
    } catch(e) { fail('Castel', e.message) }

}; testProviders();
