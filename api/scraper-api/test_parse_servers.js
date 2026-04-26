const cheerio = require('cheerio');
(async()=>{ 
    try { 
        const r=await fetch('https://animesalt.ac/episode/naruto-1x1/'); 
        const html = await r.text(); 
        const $ = cheerio.load(html); 
        console.log("Languages:");
        $('.servers-area').each((i, e) => {
            console.log($(e).html()?.substring(0, 300));
        });
        $('.episodes-list').each((i, e) => {
            console.log("EpisodesList", $(e).html()?.substring(0, 50));
        });
        $('.video-container').each((i, e) => {
             console.log("video-container", $(e).html()?.substring(0, 300));
        });

        // let's grab all data-src
        const dataSrcs = [];
        $('[data-src]').each((i, e) => {
            dataSrcs.push($(e).attr('data-src'));
        });
        console.log("Data Srcs", dataSrcs);
    }catch(e){console.error(e)} 
})();
