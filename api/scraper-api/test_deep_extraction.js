// Native fetch
const BASE = 'http://localhost:9090';

const PROVIDERS = ['netmirror'];

const DIRECT_HOSTS = ['pixeldrain', 'gofile.io', 'dropapk', 'terabox', '1024tera', 'streamtape', 'mixdrop', 'upstream', 'doodstream', 'drive.google', 'mega.nz', '.mkv', '.mp4', '.avi', '.zip', '.rar'];
const HUB_HOSTS = ['hubcloud', 'hubdrive', 'vcloud', 'drivefly', 'hblinks', 'techy.youdontcare'];
const GADGET_HOSTS = ['gadgetsweb', 'cryptoinsights', 'cryptonewz', 'bonuscaf', 'gadgets'];
const SAFELINK_HOSTS = ['unblockedgames.world', 'techy.in', 'tech2down'];
const MDRIVE_HOSTS = ['mdrive', 'drive.movies', 'mdfiles', 'animeflix.dad', 'leechpro.blog', 'modpro.blog'];

function detectLinkType(url) {
    if (!url) return 'unknown';
    const l = url.toLowerCase();
    if (HUB_HOSTS.some(h => l.includes(h))) return 'hub';
    if (GADGET_HOSTS.some(h => l.includes(h))) return 'gadget';
    if (SAFELINK_HOSTS.some(h => l.includes(h))) return 'safelink';
    if (MDRIVE_HOSTS.some(h => l.includes(h))) return 'mdrive';
    if (l.includes('gdflix') || l.includes('driveflix')) return 'gdflix';
    if (DIRECT_HOSTS.some(h => l.includes(h))) return 'direct';
    return 'unknown';
}

async function extractDeep(url, referer, depth = 0) {
    if (depth > 3) return { url, type: 'max_depth' };
    const type = detectLinkType(url);

    try {
        if (type === 'hub') {
            const res = await fetch(`${BASE}/api/extractors/hubcloud?url=${encodeURIComponent(url)}`).catch(e => null);
            if (!res || !res.ok) return { url, type: 'hub_failed' };
            const data = await res.json();
            if (data.success && data.links && data.links.length > 0) {
                const best = data.links.find(l => l.link.includes('.mkv') || l.link.includes('.mp4')) || data.links[0];
                return { url: best.link, name: best.name, type: 'final_hub' };
            }
        }
        else if (type === 'gdflix') {
            const res = await fetch(`${BASE}/api/extractors/gdflix?url=${encodeURIComponent(url)}`).catch(e => null);
            if (!res || !res.ok) return { url, type: 'gdflix_failed' };
            const data = await res.json();
            if (data.success && data.links && data.links.length > 0) {
                return { url: data.links[0].link, name: data.links[0].name, type: 'final_gdflix' };
            }
        }
        else if (type === 'safelink') {
            const res = await fetch(`${BASE}/api/extractors/safelink?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`).catch(e => null);
            if (!res || !res.ok) return { url, type: 'safelink_failed' };
            const data = await res.json();
            if (data.success && data.resolvedUrl) {
                return extractDeep(data.resolvedUrl, url, depth + 1);
            }
        }
        else if (type === 'gadget') {
            const res = await fetch(`${BASE}/api/extractors/gadgetsweb?url=${encodeURIComponent(url)}&referer=${encodeURIComponent(referer)}`).catch(e => null);
            if (!res || !res.ok) return { url, type: 'gadget_failed' };
            const data = await res.json();
            if (data.success && data.directLink) {
                return extractDeep(data.directLink, url, depth + 1);
            }
        }
        else if (type === 'direct') {
            return { url, type: 'direct_dl' };
        }
        else if (type === 'mdrive') {
            let endpoint = '/api/drive/mdrive';
            if (url.includes('animeflix') || url.includes('leechpro') || url.includes('modpro')) endpoint = '/api/drive/animeflix';
            const res = await fetch(`${BASE}${endpoint}?url=${encodeURIComponent(url)}`).catch(e => null);
            if (!res || !res.ok) return { url, type: 'mdrive_failed' };
            const data = await res.json();
            if (data.episodes && data.episodes.length > 0) {
                return extractDeep(data.episodes[0].hubCloudUrl || data.episodes[0].link, url, depth + 1);
            }
        }
    } catch(e) {}
    
    return { url, type: 'unresolved_' + type };
}

async function testAll() {
    console.log('Testing Deep Extraction on all providers... This will take a moment.');
    for (const p of PROVIDERS) {
        console.log(`\n=================== [${p.toUpperCase()}] ===================`);
        try {
            // 1. Fetch search / home
            console.log(`1. Fetching first movie...`);
            let searchUrl = `${BASE}/api/${p}${(p==='hdhub4u'||p==='4khdhub'||p.startsWith('modlist/'))?'/search?q=a':'?page=1'}`;
            if (p === 'animesalt') searchUrl = `${BASE}/api/animesalt?action=home`;
            const res = await fetch(searchUrl);
            const data = await res.json();
            
            let movies = [];
            if (p === 'drive') movies = data.movies || [];
            else if (p === 'hdhub4u' || p === '4khdhub') movies = data.data?.results || data.data?.recentMovies || data.results || data.data || [];
            else if (p.startsWith('modlist/')) movies = data.movies || [];
            else if (p === 'animesalt') movies = data.data.popularSeries || data.data.popularMovies || [];
            else movies = data.data?.recentMovies || data.results || data.data || data.movies || data.data?.searchResults?.searchResult || [];

            if (!movies || !Array.isArray(movies) && typeof movies === 'object') movies = Object.values(movies);
            
            if (!movies || !movies.length) {
                console.log(`❌ No movies retrieved.`);
                continue;
            }

            const movie = movies[0];
            const mUrl = movie.url || movie.link || movie.href || movie.id;
            console.log(`✔️ Selected: ${movie.title || movie.name} \n   URL: ${mUrl}`);

            // 2. Fetch details
            console.log(`2. Fetching details...`);
            let detailQ = mUrl ? `?url=${encodeURIComponent(mUrl)}` : `?id=${movie.id}`;
            if (p === 'animesalt') detailQ = `?action=details&url=${encodeURIComponent(mUrl)}`;
            const detRes = await fetch(`${BASE}/api/${p}/details${detailQ}`);
            const detData = await detRes.json();
            const d = detData.data || detData;
            
            let links = [];
            let isStream = false;

            if (p === 'animesalt') {
                if (d.seasons && d.seasons[0].episodes[0]) {
                    const epUrl = d.seasons[0].episodes[0].url;
                    console.log(`   Found episode: ${epUrl}`);
                    const strRes = await fetch(`${BASE}/api/animesalt?action=stream&url=${encodeURIComponent(epUrl)}`);
                    const strData = await strRes.json();
                    if (strData.data && strData.data.proxiedM3u8) {
                        console.log(`✅ EXTACTED NATIVE M3U8 STREAM`);
                        console.log(`   --> ${strData.data.proxiedM3u8}`);
                        isStream = true;
                    }
                }
            } else if (d.downloadLinks && d.downloadLinks.length) {
                if(d.downloadLinks[0].links) links = d.downloadLinks[0].links; // modlist
                else links = d.downloadLinks;
            } else if (d.episodes && d.episodes.length) {
                links = d.episodes[0].links || d.episodes[0];
            } else if (p === 'drive' && d.downloadLinks) {
                links = Object.values(d.downloadLinks).flat();
            }
            
            if (isStream) continue;

            if (!links || !links.length) {
                console.log(`❌ No download links found in details.`);
                continue;
            }

            let linkObj = links.find(l => detectLinkType(l.url || l.link || l.serverUrl) !== 'unknown') || links[0];
            let rawUrl = linkObj.url || linkObj.link || linkObj.serverUrl;
            let quality = linkObj.quality || linkObj.type || linkObj.title || linkObj.server || 'Unknown Quality';
            let lang = d.language || d.langs ? JSON.stringify(d.langs) : 'Unknown Lang';

            console.log(`   Found link: [${quality}] (${lang})`);
            console.log(`   Raw Link: ${rawUrl}`);

            // 3. Deep Extract
            console.log(`3. Running SMART Extraction...`);
            const final = await extractDeep(rawUrl, mUrl);
            
            if (final.url.includes('.mkv') || final.url.includes('.mp4') || final.url.includes('cdn') || final.type.includes('final')) {
                console.log(`✅ FINAL DIRECT LINK (${final.type}):\n   --> ${final.url}`);
            } else {
                console.log(`⚠️ RESOLVED BUT UNCERTAIN (${final.type}):\n   --> ${final.url}`);
            }

        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

testAll();
