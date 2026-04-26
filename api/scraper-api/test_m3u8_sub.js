 

(async()=>{ 
    try { 
        const r=await fetch('http://localhost:9090/api/animesalt/stream?url=https://animesalt.ac/episode/naruto-1x1/'); 
        const json = await r.json(); 
        const r2=await fetch(json.data.masterM3u8); 
        const m3u8 = await r2.text(); 
        const match = m3u8.match(/URI=\"([^\"]+)\"/); 
        if(match) { 
            const relativeStr = match[1]; 
            const masterUrl = json.data.masterM3u8; 
            const absUrl = new URL(relativeStr, masterUrl).toString(); 
            console.log('sub playlist:', absUrl); 
            const r3 = await fetch('http://localhost:9090/api/proxy?url=' + encodeURIComponent(absUrl) + '&req_referer=https://as-cdn21.top'); 
            const sub = await r3.text(); 
            console.log(sub.substring(0, 500)); 
            
            // fetch first TS
            const tsMatch = sub.split('\n').find(l => l && !l.startsWith('#'));
            if(tsMatch) {
               console.log("TS chunk relative URL:", tsMatch);
            }
        } 
    }catch(e){console.error(e)} 
})();
