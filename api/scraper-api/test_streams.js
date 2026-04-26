const testStreams = async () => {
    const port = 9090;
    const base = 'http://localhost:' + port;
    const report = (prov, status, details) => console.log(`[${status}] ${prov} -> ${details}`);

    console.log('--- Checking MP4 / M3U8 links individually ---');

    // 1. TheMovieBox - search and get details
    try {
        const sRes = await fetch(`${base}/api/themovie?action=search&q=pushpa`);
        const sJ = await sRes.json();
        const url = sJ.results?.[0]?.watchUrl;
        if(url) {
            const dRes = await fetch(`${base}/api/themovie?action=details&url=${encodeURIComponent(url)}`);
            const dJ = await dRes.json();
            const streams = dJ.watchOnline?.streams;
            if(streams?.length > 0) report('TheMovieBox', '🟩 MP4/M3U8', `${streams.length} stream links found (Qualities: ${streams.map(s => s.quality).join(', ')})`);
            else report('TheMovieBox', '🟥 No Streams', 'Found details but no streams');
        }
    } catch(e) { report('TheMovieBox', '🟥 Error', e.message); }

    // 2. NetMirror - by TMDB ID
    try {
        const dRes = await fetch(`${base}/api/netmirror?id=690369&type=movie`);
        const dJ = await dRes.json();
        const streams = dJ.data?.streams;
        if (streams?.length > 0) report('NetMirror', '🟩 M3U8', `${streams.length} stream links found (e.g. ${streams[0].url.substring(0,25)}...)`);
        else report('NetMirror', '🟥 No Streams', 'Response had no streams');
    } catch(e) { report('NetMirror', '🟥 Error', e.message); }

    // 3. AnimeSalt
    try {
        // ID for demon slayer is 258 or we use search results from demon
        const asS = await fetch(`${base}/api/animesalt?action=search&q=demon`);
        const sJ = await asS.json();
        const asUrl = sJ.results?.[0]?.url;
        const asId = sJ.results?.[0]?.id || asUrl.split('/').filter(Boolean).pop();
        if(asId) {
             const dRes = await fetch(`${base}/api/animesalt?action=details&id=${asId}`);
             const dJ = await dRes.json();
             const ep = dJ.data?.episodes?.[0]?.number;
             if (ep) {
                  const sRes = await fetch(`${base}/api/animesalt?action=stream&id=${asId}&ep=${ep}`);
                  const str = await sRes.json();
                  const streams = str.data?.streams;
                  if (streams && streams.length > 0) report('AnimeSalt', '🟩 M3U8', `${streams.length} stream links found`);
                  else report('AnimeSalt', '🟥 No Streams', 'Found episodes but no stream links');
             } else report('AnimeSalt', '🟥 Error', 'No episodes');
        }
    } catch(e) { report('AnimeSalt', '🟥 Error', e.message); }

    // 4. Castel - by TMDB ID
    try {
        const dRes = await fetch(`${base}/api/castel?id=690369&type=movie`);
        const dJ = await dRes.json();
        if(dJ.success && dJ.data?.streams?.length > 0) {
             report('Castel', '🟩 M3U8', `${dJ.data.streams.length} stream links found`);
        } else {
             report('Castel', '🟥 No Streams', '');
        }
    } catch(e) { report('Castel', '🟥 Error', e.message); }

    // 5. HDHub4u
    try {
         const hdRes = await fetch(`${base}/api/hdhub4u/search?q=pushpa`);
         const j = await hdRes.json();
         const first = j.data?.results?.[0];
         if(first) {
             const dRes = await fetch(`${base}/api/hdhub4u?url=${encodeURIComponent(first.url)}`);
             const det = await dRes.json();
             const links = det.data?.downloadLinks?.length;
             report('HDHub4u', '🟩 Download Bypass', `${links} download groups provided. Direct MP4: ${det.data?.streamLinks?.length || 0}`);
         }
    } catch(e) { report('HDHub4u', '🟥 Error', e.message); }

    // 6. MoviesMod
    try {
         const md = await fetch(`${base}/api/mod?q=avengers`);
         const mdJ = await md.json();
         const mmUrl = mdJ.data?.[0]?.url || mdJ.movies?.[0]?.url;
         if (mmUrl) {
             const det = await fetch(`${base}/api/mod?action=details&url=${encodeURIComponent(mmUrl)}`);
             const d = await det.json();
             const dl = d.data?.downloadGroups?.length || d.downloadLinks?.length || 0;
             report('MoviesMod', '🟩 Download Bypass', `${dl} download groups/servers provided.`);
         } else report('MoviesMod', '🟥 No Results', '');
    } catch(e) { report('MoviesMod', '🟥 Error', e.message); }
}; testStreams();
