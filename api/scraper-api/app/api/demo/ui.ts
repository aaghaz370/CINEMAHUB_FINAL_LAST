/* eslint-disable */
export function getDemoUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CinemaHub Universal Demo</title>
<meta name="description" content="Search movies and series across all providers">
<style>
:root{--bg:#08080a;--bg-card:#111114;--bg-hover:#1c1c21;--pri:#c026d3;--pri2:#7c3aed;--txt:#f1f5f9;--mu:#71717a;--brd:#1f1f27;--g:rgba(10,10,14,.75);--ok:#22c55e;--err:#ef4444;--warn:#eab308;--info:#3b82f6;}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;}
html,body{min-height:100vh;}body{background:var(--bg);color:var(--txt);overflow-x:hidden;}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--pri);border-radius:9px}
header{position:sticky;top:0;z-index:50;background:var(--g);backdrop-filter:blur(16px);border-bottom:1px solid var(--brd);padding:.75rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap;}
.brand{font-size:1.4rem;font-weight:900;background:linear-gradient(135deg,var(--pri),var(--pri2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;flex-shrink:0;}
.swrap{display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--brd);border-radius:99px;padding:.25rem .9rem;flex:1;max-width:500px;transition:border-color .2s,box-shadow .2s;}
.swrap:focus-within{border-color:var(--pri);box-shadow:0 0 0 3px rgba(192,38,211,.15);}
.swrap input{flex:1;background:transparent;border:none;color:var(--txt);padding:.4rem .4rem;outline:none;font-size:1rem;}
.swrap button{background:linear-gradient(135deg,var(--pri),var(--pri2));border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:.9rem;flex-shrink:0;display:grid;place-items:center;}
.dbtn.bypass:hover{background:#3f3f46}
.dbtn.play{background:rgba(59,130,246,0.1);color:#60a5fa;border-left:2px solid #3b82f6}
.dbtn.play:hover{background:rgba(59,130,246,0.2)}
.epgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:.5rem;margin-top:.5rem}
.ep{background:#27272a;border:1px solid #3f3f46;color:#a1a1aa;padding:.4rem;border-radius:.3rem;font-size:.85rem;cursor:pointer;text-align:center;transition:all .2s;font-family:monospace}
.ep:hover{background:#3b82f6;color:#FFF;border-color:#2563eb}
.erbox{background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;color:#fca5a5;padding:1rem;border-radius:.3rem;margin:1rem 0;font-size:.9rem}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#27272a;color:#FFF;padding:.8rem 1.5rem;border-radius:2rem;font-size:.9rem;opacity:0;pointer-events:none;transition:opacity .3s;z-index:3000;box-shadow:0 10px 25px rgba(0,0,0,0.5)}
#toast.ok,#toast.er{opacity:1}
#toast.er{background:#ef4444;color:#FFF}
/* Player Controls */
#pctrl{padding:12px;background:#09090b;border-top:1px solid #27272a;}
.ctrl-row{display:flex;align-items:center;margin-bottom:8px;gap:12px;}
.ctrl-row:last-child{margin-bottom:0;}
.ctrl-lbl{color:#a1a1aa;font-size:12px;min-width:50px;text-transform:uppercase;letter-spacing:.5px;}
.ctrl-opts{display:flex;flex-wrap:wrap;gap:6px;}
.cb{background:#27272a;border:1px solid #3f3f46;color:#e4e4e7;padding:4px 10px;border-radius:4px;font-size:13px;cursor:pointer;transition:all .2s;}
.cb:hover{background:#3f3f46;border-color:#52525b;}
.cb.act{background:#3b82f6;border-color:#2563eb;color:#fff;font-weight:500;}
.fbtns{display:flex;gap:5px;flex-shrink:0;}
.fbtn{background:var(--bg-card);border:1px solid var(--brd);color:var(--mu);padding:5px 12px;border-radius:99px;cursor:pointer;font-size:.78rem;font-weight:600;transition:.15s;}
.fbtn:hover,.fbtn.active{background:var(--pri);color:#fff;border-color:var(--pri);}
main{padding:1.25rem 1.5rem;max-width:1500px;margin:0 auto;}
.spanel{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.6rem;margin-bottom:1.25rem;}
.sc{background:var(--bg-card);border:1px solid var(--brd);border-radius:10px;padding:.8rem;}
.sh{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.spn{font-weight:700;font-size:.9rem;}
.sb{font-size:.68rem;padding:2px 7px;border-radius:99px;font-weight:600;}
.bok{background:rgba(34,197,94,.1);color:var(--ok);border:1px solid rgba(34,197,94,.2);}
.bfail{background:rgba(239,68,68,.1);color:var(--err);border:1px solid rgba(239,68,68,.2);}
.bzero{background:rgba(234,179,8,.1);color:var(--warn);border:1px solid rgba(234,179,8,.2);}
.sm{font-size:.78rem;color:var(--mu);}
.se{font-size:.72rem;color:var(--err);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rh{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem;flex-wrap:wrap;gap:.4rem;}
.rc{font-size:.88rem;color:var(--mu);}
.rc strong{color:var(--txt);}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:1rem;}
.card{background:var(--bg-card);border-radius:12px;overflow:hidden;border:1px solid var(--brd);cursor:pointer;display:flex;flex-direction:column;position:relative;transition:transform .2s,border-color .2s,box-shadow .2s;}
.card:hover{transform:translateY(-5px);border-color:var(--pri);box-shadow:0 10px 30px rgba(192,38,211,.15);}
.ci{width:100%;aspect-ratio:2/3;object-fit:cover;background:#1a1a20;display:block;}
.cpt{position:absolute;top:7px;left:7px;font-size:.62rem;padding:2px 7px;border-radius:99px;font-weight:700;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);}
.ts{color:var(--info);}
.td{color:var(--warn);}
.cc{padding:.7rem;flex:1;display:flex;flex-direction:column;gap:5px;}
.ct{font-weight:600;font-size:.85rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.tags{display:flex;flex-wrap:wrap;gap:3px;}
.tag{font-size:.65rem;padding:2px 6px;border-radius:4px;font-weight:600;}
.tp{background:rgba(192,38,211,.15);color:var(--pri);border:1px solid rgba(192,38,211,.2);}
.tf{background:rgba(59,130,246,.12);color:var(--info);border:1px solid rgba(59,130,246,.18);}
.tq{background:rgba(234,179,8,.1);color:var(--warn);border:1px solid rgba(234,179,8,.18);}
.tl{background:rgba(34,197,94,.1);color:var(--ok);border:1px solid rgba(34,197,94,.18);}
.loader{text-align:center;color:var(--mu);padding:2rem;grid-column:1/-1;}
@keyframes sp{to{transform:rotate(360deg)}}
.spin{display:inline-block;animation:sp 1s linear infinite;margin-right:6px;}
.empty{text-align:center;padding:3rem;color:var(--mu);grid-column:1/-1;}
/* Modal */
.moverlay{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(8px);z-index:200;display:none;justify-content:center;align-items:center;padding:1rem;}
.moverlay.open{display:flex;}
.modal{background:var(--bg);border:1px solid var(--brd);border-radius:16px;width:100%;max-width:940px;max-height:90vh;overflow-y:auto;animation:mIn .28s ease;}
@keyframes mIn{from{opacity:0;transform:scale(.93) translateY(18px)}to{opacity:1;transform:none}}
.mtop{display:flex;justify-content:flex-end;padding:.8rem .8rem 0;}
.mcls{background:var(--bg-card);border:1px solid var(--brd);color:var(--mu);width:32px;height:32px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1rem;}
.mcls:hover{background:var(--err);color:#fff;border-color:var(--err);}
.mbody{padding:0 1.25rem 1.25rem;display:flex;gap:1.25rem;}
.mposter{width:180px;flex-shrink:0;border-radius:10px;overflow:hidden;border:1px solid var(--brd);align-self:flex-start;}
.mposter img{width:100%;display:block;}
.minfo{flex:1;display:flex;flex-direction:column;gap:.8rem;min-width:0;}
.mtitle{font-size:1.4rem;font-weight:800;line-height:1.2;}
.mtags{display:flex;flex-wrap:wrap;gap:5px;}
.lg{background:var(--bg-card);border:1px solid var(--brd);border-radius:10px;overflow:hidden;margin-bottom:.65rem;}
.lh{padding:.65rem .9rem;font-weight:700;font-size:.88rem;background:rgba(255,255,255,.03);border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center;}
.lmeta{display:flex;gap:5px;font-size:.68rem;}
.lbq{padding:2px 7px;border-radius:99px;background:rgba(234,179,8,.1);color:var(--warn);border:1px solid rgba(234,179,8,.18);}
.lbl{padding:2px 7px;border-radius:99px;background:rgba(34,197,94,.1);color:var(--ok);border:1px solid rgba(34,197,94,.18);}
.lbtns{padding:.65rem;display:flex;flex-wrap:wrap;gap:7px;}
.dbtn{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:7px;font-size:.83rem;font-weight:600;border:1px solid var(--brd);background:var(--bg);color:var(--txt);cursor:pointer;transition:.15s;text-decoration:none;font-family:inherit;}
.dbtn:hover{background:var(--bg-hover);border-color:var(--pri);}
.dbtn.play{border-color:rgba(34,197,94,.4);color:var(--ok);}
.dbtn.play:hover{background:rgba(34,197,94,.08);}
.dbtn.bypass{border-color:rgba(234,179,8,.3);color:var(--warn);}
.dbtn.bypass:hover{background:rgba(234,179,8,.06);}
.dbtn.resolving{opacity:.6;pointer-events:none;}
.dbtn.done{border-color:var(--ok);color:var(--ok);}
.epgrid{display:flex;flex-wrap:wrap;gap:5px;padding:.65rem;}
.ep{background:var(--bg);border:1px solid var(--brd);color:var(--mu);padding:4px 11px;border-radius:5px;font-size:.78rem;font-weight:600;cursor:pointer;transition:.15s;font-family:inherit;}
.ep:hover{border-color:var(--pri);color:var(--pri);}
.bbk{background:var(--bg-card);border:1px solid var(--brd);color:var(--mu);padding:5px 12px;border-radius:7px;font-size:.8rem;font-weight:600;cursor:pointer;margin-bottom:.65rem;display:inline-flex;align-items:center;gap:5px;font-family:inherit;}
.bbk:hover{border-color:var(--pri);color:var(--pri);}
.erbox{padding:.9rem;color:var(--err);}
/* Multi-stream player panel */
.msp{background:var(--bg-card);border:1px solid var(--brd);border-radius:10px;padding:.75rem;margin-bottom:.65rem;}
.msp-title{font-weight:700;font-size:.88rem;margin-bottom:.5rem;color:var(--txt);}
.msp-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;flex-wrap:wrap;}
.msp-label{font-size:.78rem;color:var(--mu);width:70px;flex-shrink:0;}
.msp-opts{display:flex;gap:5px;flex-wrap:wrap;}
.msp-opt{background:var(--bg);border:1px solid var(--brd);color:var(--mu);padding:3px 10px;border-radius:5px;font-size:.78rem;cursor:pointer;font-family:inherit;transition:.15s;}
.msp-opt:hover,.msp-opt.sel{background:var(--pri);color:#fff;border-color:var(--pri);}
.msp-play{margin-top:.5rem;}
/* Player */
#po{display:none;position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;flex-direction:column;justify-content:center;align-items:center;}
#po.open{display:flex;}
.ptop{position:absolute;top:0;left:0;right:0;padding:1rem 1.5rem;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(to bottom,rgba(0,0,0,.8),transparent);}
.ptitle{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw;}
.pcls{background:rgba(239,68,68,.8);color:#fff;border:none;padding:7px 16px;border-radius:7px;font-weight:700;cursor:pointer;font-family:inherit;}
#ve{width:100%;max-width:1280px;aspect-ratio:16/9;background:#000;outline:none;border-radius:10px;}
/* Toast */
#toast{position:fixed;bottom:20px;right:20px;padding:11px 18px;border-radius:9px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);transform:translateY(80px);opacity:0;transition:.28s;z-index:9999;max-width:340px;pointer-events:none;}
#toast.ok{background:var(--ok);color:#fff;transform:translateY(0);opacity:1;}
#toast.er{background:var(--err);color:#fff;transform:translateY(0);opacity:1;}
@media(max-width:640px){.mbody{flex-direction:column;}.mposter{width:100%;max-width:160px;}}
</style>
</head>
<body>
<header>
  <div class="brand">&#9654; CinemaHub</div>
  <form id="sf" class="swrap">
    <input id="qb" type="text" placeholder="Search movies, series, anime..." value="pushpa 2" required autocomplete="off">
    <button type="submit">&#128269;</button>
  </form>
  <div class="fbtns">
    <button class="fbtn active" data-t="">All</button>
    <button class="fbtn" data-t="stream">Stream</button>
    <button class="fbtn" data-t="download">Download</button>
    <button class="fbtn" data-t="anime">Anime</button>
  </div>
</header>
<main>
  <div id="sp" class="spanel" style="display:none"></div>
  <div id="rh" class="rh" style="display:none">
    <span id="rc" class="rc"></span>
    <span id="rt" style="font-size:.78rem;color:var(--mu)"></span>
  </div>
  <div id="gr" class="grid"><div class="loader"><span class="spin">&#10227;</span> Loading...</div></div>
</main>

<div class="moverlay" id="mo">
  <div class="modal">
    <div class="mtop"><button class="mcls" id="mcb">&#10005;</button></div>
    <div class="mbody">
      <div class="mposter"><img id="mp" src="" alt="poster" onerror="this.src='https://placehold.co/180x270/111114/71717a?text=?'"></div>
      <div class="minfo">
        <h2 class="mtitle" id="mt"></h2>
        <div class="mtags" id="mta"></div>
        <div id="la"></div>
      </div>
    </div>
  </div>
</div>

<div id="po">
  <div class="ptop"><span class="ptitle" id="ptit"></span><button class="pcls" id="pcls">&#10005; Close</button></div>
  <video id="ve" controls playsinline></video>
  <div id="pctrl" style="display:none;">
    <div class="ctrl-row"><span class="ctrl-lbl">Audio:</span><div id="caud" class="ctrl-opts"></div></div>
    <div class="ctrl-row"><span class="ctrl-lbl">Quality:</span><div id="cqua" class="ctrl-opts"></div></div>
  </div>
</div>
<div id="toast"></div>

<script>
var _ci = null, _ht = null, _ct = '';

function G(id){return document.getElementById(id);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function enc(s){return encodeURIComponent(s||'');}
function pad2(n){return String(n).padStart(2,'0');}
function aj(u){return fetch(u).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});}
function toast(msg,err){var t=G('toast');t.textContent=msg;t.className=err?'er':'ok';clearTimeout(t.__t);t.__t=setTimeout(function(){t.className='';},3500);}

// ── HTML Builders
function lge(title,body){return '<div class="lg"><div class="lh">'+esc(title)+'</div><div class="lbtns">'+body+'</div></div>';}
function lgem(title,meta,body){return '<div class="lg"><div class="lh"><span>'+esc(title)+'</span><div class="lmeta">'+meta+'</div></div><div class="lbtns">'+body+'</div></div>';}
function erbox(msg){return '<div class="erbox">&#9888; '+esc(String(msg))+'</div>';}
function bbk(){return '<button class="bbk" onclick="window._back()">&#8592; Back</button>';}

// Play button — uses data-pu and data-pt attributes (no inline quotes in onclick)
function pbtn(label,url,title){
  var id='pb_'+Math.random().toString(36).substr(2,9);
  // Store url/title as data attrs to avoid quote escaping issues in onclick string
  return '<button id="'+id+'" class="dbtn play" data-pu="'+esc(url||'')+'" data-pt="'+esc(title||'')+'" onclick="window._pv(this)">&#9654; '+esc(label)+'</button>';
}

// Bypass button — data-burl attr
function bbtn(label,url){
  return '<button class="dbtn bypass" data-burl="'+esc(url||'')+'" onclick="window._byp(this)">&#8595; '+esc(label)+'</button>';
}

// Episode button — stores onclick string safely
function ebtn(label,fnstr){
  return '<button class="ep" data-fn="'+esc(fnstr)+'" onclick="window._ep(this)">'+esc(label)+'</button>';
}

// ── Video Player
window._pv = function(btn){
  var url=btn.getAttribute('data-pu')||'';
  var title=btn.getAttribute('data-pt')||'';
  if(!url){toast('No stream URL',true);return;}
  var po=G('po'),ve=G('ve');
  G('ptit').textContent=title||'Video';
  po.classList.add('open');
  if(_ht){_ht.destroy();_ht=null;}
  ve.src='';
  var isM=(url.indexOf('.m3u8')!==-1||url.indexOf('/proxy')!==-1||url.indexOf('m3u8')!==-1);
  if(isM&&typeof Hls!=='undefined'&&Hls.isSupported()){
    _ht=new Hls({maxBufferLength:45,enableWorker:false});
    _ht.loadSource(url);_ht.attachMedia(ve);
    _ht.on(Hls.Events.MANIFEST_PARSED,function(){
        ve.play().catch(function(){});
        G('pctrl').style.display='block';
        if(window._bQ) window._bQ();
    });
    _ht.on(Hls.Events.LEVEL_SWITCHED, function(){ if(window._bQ) window._bQ(); });
    _ht.on(Hls.Events.AUDIO_TRACK_LOADED, function(){ if(window._bA) window._bA(); });
    _ht.on(Hls.Events.AUDIO_TRACK_SWITCHED, function(){ if(window._bA) window._bA(); });
    _ht.on(Hls.Events.ERROR,function(e,d){if(d.fatal){toast('HLS error: '+d.type,true);}});
  }else if(isM&&ve.canPlayType('application/vnd.apple.mpegurl')){
    ve.src=url;ve.play();
  }else{ve.src=url;ve.play().catch(function(){});}
};

window._bQ=function(){
  if(!_ht||!_ht.levels)return;
  var cl=_ht.currentLevel, al=_ht.autoLevelEnabled;
  var html='<button class="cb '+(al?'act':'')+'" onclick="window._setQ(-1)">Auto</button>';
  _ht.levels.forEach(function(l,i){
    html+='<button class="cb '+(!al&&cl===i?'act':'')+'" onclick="window._setQ('+i+')">'+(l.height?l.height+'p':'Q'+i)+'</button>';
  });
  var c=G('cqua');if(c)c.innerHTML=html;
};
window._setQ=function(i){if(_ht){_ht.currentLevel=i;window._bQ();}};

window._bA=function(){
  if(!_ht||!_ht.audioTracks)return;
  var ct=_ht.audioTrack;
  var html='';
  _ht.audioTracks.forEach(function(t,i){
    html+='<button class="cb '+(ct===i?'act':'')+'" onclick="window._setA('+i+')">'+esc(t.name||t.language||'Audio '+(i+1))+'</button>';
  });
  var c=G('caud');if(c)c.innerHTML=html||'<span style="color:#71717a;font-size:12px;">Default Audio Only</span>';
};
window._setA=function(i){if(_ht){_ht.audioTrack=i;window._bA();}};

function cp(){var ve=G('ve');G('po').classList.remove('open');G('pctrl').style.display='none';ve.pause();ve.src='';if(_ht){_ht.destroy();_ht=null;}}
G('pcls').onclick=cp;
G('po').addEventListener('click',function(e){if(e.target===G('po'))cp();});

// ── Episode button runner
window._ep = function(btn){
  var fn=btn.getAttribute('data-fn')||'';
  try{eval(fn);}catch(e){toast('Error: '+e.message,true);}
};

// ── Back button
window._back = function(){if(_ci)rl(_ci);};

// ── Bypass engine — handle download host redirects
window._byp = function(btn){
  var url=btn.getAttribute('data-burl')||'';
  if(!url){return;}
  // HubCloud/HubDrive — use hubcloud extractor
  var HUBS=['hubcloud','hubdrive','vcloud'];
  if(HUBS.some(function(h){return url.indexOf(h)!==-1;})){
    btn.classList.add('resolving');btn.textContent='Resolving...';
    fetch('/api/extractors/hubcloud?url='+encodeURIComponent(url))
      .then(function(r){return r.json();})
      .then(function(r){
        btn.classList.remove('resolving');
        if(r.links&&r.links.length){
          var best=r.links[0].link||r.links[0].url||'';
          btn.textContent='\u2193 Direct Link';btn.classList.add('done');
          btn.setAttribute('data-burl',best);
          window.open(best,'_blank');
        }else{btn.textContent='Open';window.open(url,'_blank');}
      }).catch(function(){btn.classList.remove('resolving');btn.textContent='Open';window.open(url,'_blank');});
    return;
  }
  // Gadgetsweb — needs url+referer, returns directLink
  var GADGETS=['gadgetsweb','hblinks.dad','cryptoinsights','linkxyz','filexyz'];
  if(GADGETS.some(function(h){return url.indexOf(h)!==-1;})){
    btn.classList.add('resolving');btn.textContent='Resolving...';
    // referer = the provider page that had this link
    var ref=(_ci&&_ci.url)||window.location.href;
    fetch('/api/extractors/gadgetsweb?url='+encodeURIComponent(url)+'&referer='+encodeURIComponent(ref))
      .then(function(r){return r.json();})
      .then(function(r){
        btn.classList.remove('resolving');
        var dl=r.directLink||r.finalUrl||'';
        if(dl){
          btn.textContent='\u2193 Direct';btn.classList.add('done');
          btn.setAttribute('data-burl',dl);
          // If the resolved link is another bypass host, recurse
          if(dl.indexOf('hubcloud')!==-1||dl.indexOf('hubdrive')!==-1){
            window._byp(btn);
          }else{
            window.open(dl,'_blank');
          }
        }else{btn.textContent='Open';window.open(url,'_blank');}
      }).catch(function(){btn.classList.remove('resolving');btn.textContent='Open';window.open(url,'_blank');});
    return;
  }
  // General redirect hosts — use redirect follower
  var REDIR=['getlinks','leechpro','modpro','drivebot','filedot','mdrive','drivehub','filepress','drivemax'];
  if(REDIR.some(function(h){return url.indexOf(h)!==-1;})){
    btn.classList.add('resolving');btn.textContent='Resolving...';
    fetch('/api/extractors/redirect?url='+encodeURIComponent(url))
      .then(function(r){return r.json();})
      .then(function(r){
        btn.classList.remove('resolving');
        var final=r.finalUrl||r.directUrl||url;
        btn.textContent='\u2193 Direct';btn.setAttribute('data-burl',final);
        window.open(final,'_blank');
      }).catch(function(){btn.classList.remove('resolving');btn.textContent='Open';window.open(url,'_blank');});
    return;
  }
  // Direct open for everything else
  window.open(url,'_blank');
};


// ── NetMirror multi-track player builder
// NetMirror stream returns [ { sources: [...], tracks: [...] } ]
function buildNetMirrorPlayer(streamData,title){
  if(!streamData||!streamData.length)return erbox('No stream data');
  var la=G('la');

  var sData = streamData[0] || {};
  var qualities = sData.sources || [];
  var subs = sData.tracks || [];

  if(!qualities.length)return erbox('No video sources found');

  var selQ=0;

  function render(){
    var qt=qualities[selQ]||qualities[0];
    var html='<div class="msp"><div class="msp-title">'+esc(title||'Select Quality')+'</div>';
    
    // Quality row
    html+='<div class="msp-row"><span class="msp-label">Quality:</span><div class="msp-opts">';
    qualities.forEach(function(q,i){
      html+='<button class="msp-opt'+(i===selQ?' sel':'')+'" onclick="window._nmQ('+i+')">'+esc(q.label||q.title||'HD '+i)+'</button>';
    });
    html+='</div></div>';
    
    // Subs/Tracks Info (purely display, HLS determines actual audio/subs logic)
    if(subs.length){
      var cap = subs.filter(function(s){return s.kind==='captions'||s.label;});
      if(cap.length){
        html+='<div class="msp-row"><span class="msp-label">Tracks:</span><div class="msp-opts">';
        html+='<span style="font-size:0.8rem;color:var(--mu)">'+cap.map(function(c){return esc(c.label||c.language||'Sub');}).join(', ')+'</span>';
        html+='</div></div>';
      }
    }
    
    html+='<div class="msp-play">';
    html+='<p style="font-size:.78rem;color:var(--mu);margin-bottom:.5rem;">&#9432; Multiple audio tracks are included inside the player. Click Play to watch.</p>';
    html+=pbtn('&#9654; Play '+esc(qt.label||'Video'), qt.file||'', title);
    html+='</div></div>';
    la.innerHTML=html;
  }

  window._nmQ=function(i){selQ=i;render();};
  render();
}

// ── Link loaders per provider
function rl(item){
  if(!item)return;
  _ci=item;
  G('la').innerHTML='<div class="loader"><span class="spin">&#10227;</span> Fetching links from <strong>'+esc(item.provider)+'</strong>...</div>';
  var p=(item.provider||'').toLowerCase();

  // ── TheMovieBox
  if(p.indexOf('themoviebox')!==-1||p.indexOf('moviebox')!==-1){
    aj('/api/themovie?action=details&url='+enc(item.url)).then(function(d){
      if(!d.success){G('la').innerHTML=erbox('TheMovieBox: '+(d.error||'no data'));return;}
      var byL=(d.watchOnline&&d.watchOnline.byLanguage)||[];
      var strs=(d.watchOnline&&d.watchOnline.streams)||[];
      var meta=d.meta||{};var seasons=meta.seasons||[];
      var isTV=meta.subjectType===2||(seasons.length&&seasons[0].season>0);
      if(isTV&&seasons.length){
        // Group episodes by season
        var bySea={};
        seasons.forEach(function(s){if(!bySea[s.season])bySea[s.season]=[];bySea[s.season].push(s.episode);});
        var html='';
        Object.keys(bySea).sort(function(a,b){return a-b;}).forEach(function(sn){
          var epBtns=bySea[sn].map(function(ep){
            var lbl='S'+pad2(+sn)+'E'+pad2(ep);
            return ebtn('Ep '+ep,'window._tmbe('+JSON.stringify(item.url)+','+sn+','+ep+','+JSON.stringify(lbl)+')');
          }).join('');
          html+=lge('Season '+sn,'<div class="epgrid">'+epBtns+'</div>');
        });
        G('la').innerHTML=html||erbox('No episodes found');
      }else{
        var html='';
        if(byL.length){byL.forEach(function(bl){html+=sgrp(bl.lang||'Default',bl.streams||[],item.title);});}
        else if(strs.length){html=sgrp('Default',strs,item.title);}
        else{html=erbox('No streams found');}
        G('la').innerHTML=html;
      }
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── NetMirror — subjectId from item (numeric=Netflix, else=Prime)
  if(p.indexOf('netmirror')!==-1){
    var nmId=item.subjectId||item.id||'';
    if(!nmId){G('la').innerHTML=erbox('NetMirror: No ID in result');return;}
    aj('/api/netmirror?action=stream&id='+enc(nmId)).then(function(d){
      if(!d.success){G('la').innerHTML=erbox('NetMirror: '+(d.error||d.message||'failed'));return;}
      var sd=(d.data&&d.data.streamData)||[];
      if(!sd.length){G('la').innerHTML=erbox('NetMirror: Empty stream data');return;}
      buildNetMirrorPlayer(sd,item.title);
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── AnimeSalt
  if(p.indexOf('animesalt')!==-1){
    aj('/api/animesalt?action=details&url='+enc(item.url)).then(function(d){
      var seas=(d.data&&d.data.seasons)||[];
      if(!seas.length){
        // Maybe it's a movie — try stream directly
        if(d.data&&!d.data.isMovie){G('la').innerHTML=erbox('AnimeSalt: No episodes found');return;}
        // Try direct stream for movie
        window._ase(item.url,item.title);
        return;
      }
      var html='';
      seas.forEach(function(s){
        var epBtns=s.episodes.map(function(ep,i){
          var lb='Ep '+(ep.epNumRaw||(i+1));
          return ebtn(lb,'window._ase('+JSON.stringify(ep.url)+','+JSON.stringify(lb)+')');
        }).join('');
        html+=lge(s.seasonName||'Season 1','<div class="epgrid">'+epBtns+'</div>');
      });
      G('la').innerHTML=html;
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── HDHub4u
  if(p.indexOf('hdhub')!==-1){
    aj('/api/hdhub4u?action=details&url='+enc(item.url)).then(function(d){
      var data=d.data;if(!data){G('la').innerHTML=erbox('HDHub4u: No data');return;}
      var html='';
      if(data.episodes&&data.episodes.length){
        data.episodes.forEach(function(ep){
          var btns=(ep.links||[]).map(function(lk){return bbtn((lk.quality||'')+(lk.size?' \xB7 '+lk.size:'')+(lk.lang?' \xB7 '+lk.lang:''),lk.url);}).join('');
          if(btns)html+=lge(ep.episode,btns);
        });
      }else if(data.downloadLinks&&data.downloadLinks.length){
        // Group by quality+lang
        var byQ={};
        data.downloadLinks.forEach(function(lk){var k=(lk.quality||'HD')+(lk.lang?' \xB7 '+lk.lang:'');if(!byQ[k])byQ[k]=[];byQ[k].push(lk);});
        Object.keys(byQ).forEach(function(k){
          var btns=byQ[k].map(function(lk){return bbtn((lk.size?'['+lk.size+'] ':'')+k,lk.url);}).join('');
          if(btns)html+=lge(k,btns);
        });
      }
      G('la').innerHTML=html||erbox('No download links found on this page');
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── 4kHDHub — use unified route action=details
  if(p.indexOf('4khdhub')!==-1){
    aj('/api/4khdhub?action=details&url='+enc(item.url)).then(function(d){
      var data=d.data;if(!data){G('la').innerHTML=erbox('4kHDHub: No data');return;}
      var html='';
      (data.downloadLinks||[]).forEach(function(dl){
        var head=(dl.title||'')+(dl.quality?' \xB7 '+dl.quality:'')+(dl.languages?' \xB7 '+dl.languages:'')+(dl.size?' ['+dl.size+']':'');
        var btns=(dl.links||[]).map(function(lk){return bbtn(lk.server||'Download',lk.url);}).join('');
        if(btns)html+=lge(head||'Download',btns);
      });
      G('la').innerHTML=html||erbox('No 4kHDHub links found');
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── UHDMovies
  if(p.indexOf('uhd')!==-1){
    aj('/api/uhdmovies?action=details&url='+enc(item.url)).then(function(d){
      var data=d.data;if(!data){G('la').innerHTML=erbox('UHDMovies: No data');return;}
      var html='';
      if(data.episodes&&data.episodes.length){
        data.episodes.forEach(function(ep){
          var btns=(ep.links||[]).map(function(lk){return bbtn((lk.quality||'HD')+(lk.size?' ['+lk.size+']':''),lk.url);}).join('');
          if(btns)html+=lge(ep.episode,btns);
        });
      }else{
        (data.downloadLinks||[]).forEach(function(lk){
          html+=lge((lk.quality||'HD')+(lk.type?' \xB7 '+lk.type:''),bbtn((lk.size?'['+lk.size+'] ':'')+lk.type||'Download',lk.url));
        });
      }
      G('la').innerHTML=html||erbox('No UHDMovies links');
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── Drive
  if(p.indexOf('drive')!==-1){
    aj('/api/drive/details?url='+enc(item.url)).then(function(d){
      var data=d.data||d,html=rdl(data);
      G('la').innerHTML=html||lge('Drive Link',bbtn('Open Page',item.url));
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── MoviesMod
  if(p.indexOf('moviesmod')!==-1||(p.indexOf('mod')!==-1&&p.indexOf('modlist')===-1)){
    aj('/api/mod?action=details&url='+enc(item.url)).then(function(d){
      var data=d.data;if(!data){G('la').innerHTML=erbox('MoviesMod: No data');return;}
      var html='';
      (data.downloadGroups||[]).forEach(function(g){
        var meta=(g.quality?'<span class="lbq">'+esc(g.quality)+'</span>':'')+(g.lang?'<span class="lbl">'+esc(g.lang)+'</span>':'');
        var btns=(g.links||[]).map(function(lk){return bbtn((lk.server||'Download')+(lk.size?' ['+lk.size+']':''),lk.url);}).join('');
        if(btns)html+=lgem(g.title||g.quality||'Download',meta,btns);
      });
      (data.streamLinks||[]).forEach(function(s){html+=lge('Stream',pbtn(s.quality+' ['+s.format+']',s.url,item.title));});
      G('la').innerHTML=html||erbox('No MoviesMod links');
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // ── Modlist
  if(p.indexOf('modlist')!==-1){
    aj('/api/modlist/moviesmod?action=details&url='+enc(item.url)).then(function(d){
      var data=d.data;if(!data){G('la').innerHTML=erbox('Modlist: No data');return;}
      var html='';
      (data.downloadGroups||[]).forEach(function(g){
        var btns=(g.links||[]).map(function(lk){return bbtn((lk.server||'Download')+(lk.size?' ['+lk.size+']':''),lk.url);}).join('');
        if(btns)html+=lge(g.title||'Download',btns);
      });
      G('la').innerHTML=html||erbox('No Modlist links');
    }).catch(function(e){G('la').innerHTML=erbox(e.message);});
    return;
  }

  // Fallback
  G('la').innerHTML=lge('External Link','<a class="dbtn" href="'+esc(item.url)+'" target="_blank">&#8599; Open '+esc(item.provider)+' Page</a>');
}

// ── Stream group renderer for TMB/single-file providers
function sgrp(lang,streams,title){
  if(!streams||!streams.length)return'';
  var btns=streams.map(function(s){
    return pbtn((s.quality||'Auto')+(s.size?' ['+s.size+']':'')+(s.format?' '+s.format:''),s.url,(title||'')+' \u2014 '+lang);
  }).join('');
  return lge(lang,btns);
}

// ── TheMovieBox episode loader
window._tmbe=function(baseUrl,season,ep,label){
  G('la').innerHTML='<div class="loader"><span class="spin">&#10227;</span> Loading '+label+'...</div>';
  aj('/api/themovie?action=details&url='+enc(baseUrl)+'&season='+season+'&episode='+ep).then(function(d){
    var byL=(d.watchOnline&&d.watchOnline.byLanguage)||[];
    var strs=(d.watchOnline&&d.watchOnline.streams)||[];
    var html=bbk();
    if(byL.length){byL.forEach(function(bl){html+=sgrp((bl.lang||'Default')+' \u2014 '+label,bl.streams||[],label);});}
    else if(strs.length){html+=sgrp(label,strs,label);}
    else{html+=erbox('No streams for '+label);}
    G('la').innerHTML=html;
  }).catch(function(e){G('la').innerHTML=bbk()+erbox(e.message);});
};

// ── AnimeSalt episode stream loader
window._ase=function(epUrl,label){
  G('la').innerHTML='<div class="loader"><span class="spin">&#10227;</span> Loading '+esc(label||'')+'...</div>';
  aj('/api/animesalt?action=stream&url='+enc(epUrl)).then(function(d){
    if(!d.success){G('la').innerHTML=bbk()+erbox(d.error||d.message||'Stream not found');return;}
    var m3u8=d.data&&d.data.proxiedM3u8;
    var ml=(d.data&&d.data.multiLangStreams)||[];
    var html=bbk();
    if(ml.length){
      // Multi-language streams
      var btns=ml.map(function(s){return pbtn('['+(s.language||'?')+'] Play',s.link,label||'Episode');}).join('');
      html+=lge(label||'Episode',btns);
    }else if(m3u8){
      html+=lge(label||'Episode',pbtn('Play (Auto Quality)',m3u8,label||'Episode'));
    }else{
      html+=erbox('No stream URL found');
    }
    G('la').innerHTML=html;
  }).catch(function(e){G('la').innerHTML=bbk()+erbox(e.message);});
};

// ── Download data renderer (Drive/generic)
function rdl(data){
  if(!data)return'';var html='';
  if(data.downloadLinks&&Array.isArray(data.downloadLinks)){
    if(data.downloadLinks.length&&data.downloadLinks[0]&&data.downloadLinks[0].url){
      var btns=data.downloadLinks.map(function(lk){return bbtn((lk.title||lk.quality||'Download')+(lk.size?' ['+lk.size+']':''),lk.url);}).join('');
      html+=lge('Downloads',btns);
    }else{
      data.downloadLinks.forEach(function(g){
        var btns=(g.links||[]).map(function(lk){return bbtn(lk.server||'Download',lk.url);}).join('');
        if(btns)html+=lge(g.title||'Downloads',btns);
      });
    }
  }
  (data.episodes||[]).forEach(function(ep){
    var btns=(ep.links||[]).map(function(lk){return bbtn((lk.quality||'')+(lk.size?' ['+lk.size+']':''),lk.url);}).join('');
    if(btns)html+=lge(ep.episode,btns);
  });
  return html;
}

// ── Modal open
function om(item){
  _ci=item;
  G('mo').classList.add('open');
  G('mt').textContent=item.title||'';
  G('mp').src=item.imageUrl||'';
  var isS=item.providerType==='stream';
  G('mta').innerHTML='<span class="tag tp">'+esc(item.provider||'')+'</span>'+(isS?'<span class="tag tf">STREAM</span>':'<span class="tag tq">DOWNLOAD</span>');
  if(item.format)G('mta').innerHTML+='<span class="tag tf">'+esc(item.format)+'</span>';
  if(item.year)G('mta').innerHTML+='<span class="tag">'+esc(item.year)+'</span>';
  (item.languages||[]).filter(function(l){return l!=='Unknown';}).forEach(function(l){G('mta').innerHTML+='<span class="tag tl">'+esc(l)+'</span>';});
  rl(item);
}
G('mcb').onclick=function(){G('mo').classList.remove('open');};
G('mo').addEventListener('click',function(e){if(e.target===G('mo'))G('mo').classList.remove('open');});

// ── Search
function ds(q){
  G('gr').innerHTML='<div class="loader"><span class="spin">&#10227;</span> Searching all providers...</div>';
  G('sp').innerHTML='';G('sp').style.display='none';G('rh').style.display='none';
  fetch('/api/search?q='+enc(q)+(_ct?'&type='+_ct:'')+'&timeout=20000')
    .then(function(r){return r.json();})
    .then(function(data){rr(data,q);})
    .catch(function(e){G('gr').innerHTML='<div class="empty"><p>Search failed: '+esc(e.message)+'</p></div>';});
}

function rr(data,q){
  var providers=data.providers||[];
  if(providers.length){
    G('sp').style.display='grid';G('sp').innerHTML='';
    providers.forEach(function(p){
      var ok=p.success&&p.count>0,zero=p.success&&!p.count;
      var bc=ok?'bok':zero?'bzero':'bfail',bl=ok?(p.count+' results'):zero?'0 results':'Failed';
      var div=document.createElement('div');div.className='sc';
      div.innerHTML='<div class="sh"><span class="spn">'+esc(p.name)+'</span><span class="sb '+bc+'">'+bl+'</span></div><div class="sm">'+(p.elapsed||0)+'ms</div>'+(p.error?'<div class="se" title="'+esc(p.error)+'">'+esc(p.error)+'</div>':'');
      G('sp').appendChild(div);
    });
  }
  if(data.meta){
    G('rh').style.display='flex';
    G('rc').innerHTML='<strong>'+(data.meta.totalResults||0)+'</strong> results for <strong>'+esc(q)+'</strong>';
    G('rt').textContent=(data.meta.totalTimeMs||0)+'ms \u2022 '+(data.meta.providersWorking||0)+'/'+(data.meta.providersQueried||0)+' providers';
  }
  var results=data.results||[];
  G('gr').innerHTML='';
  if(!results.length){G('gr').innerHTML='<div class="empty"><p>No results. Try a different query.</p></div>';return;}
  results.forEach(function(item){
    var card=document.createElement('div');card.className='card';
    var isS=item.providerType==='stream';
    var img=document.createElement('img');img.className='ci';img.loading='lazy';img.alt=item.title||'';img.src=item.imageUrl||'';img.onerror=function(){this.src='https://placehold.co/165x248/111114/71717a?text=?';};
    var bdg=document.createElement('span');bdg.className='cpt '+(isS?'ts':'td');bdg.textContent=isS?'\u25B6 STREAM':'\u2193 DL';
    var cc=document.createElement('div');cc.className='cc';
    var ct=document.createElement('div');ct.className='ct';ct.textContent=item.title||'Untitled';
    var tags=document.createElement('div');tags.className='tags';
    tags.innerHTML='<span class="tag tp">'+esc(item.provider||'')+'</span>'+(item.format?'<span class="tag tf">'+esc(item.format)+'</span>':'');
    (item.languages||[]).filter(function(l){return l!=='Unknown';}).slice(0,2).forEach(function(l){tags.innerHTML+='<span class="tag tl">'+esc(l)+'</span>';});
    cc.appendChild(ct);cc.appendChild(tags);
    card.appendChild(img);card.appendChild(bdg);card.appendChild(cc);
    card.addEventListener('click',function(){om(item);});
    G('gr').appendChild(card);
  });
}

document.querySelectorAll('.fbtn').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.fbtn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');_ct=btn.getAttribute('data-t')||'';
    var q=G('qb').value.trim();if(q)ds(q);
  });
});
G('sf').addEventListener('submit',function(e){e.preventDefault();var q=G('qb').value.trim();if(q)ds(q);});

// Auto-search
var q0=G('qb').value.trim();
if(q0){G('gr').innerHTML='<div class="loader"><span class="spin">&#10227;</span> Searching...</div>';setTimeout(function(){ds(q0);},50);}

// Load HLS.js async
var s=document.createElement('script');
s.src='https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js';
s.async=true;document.head.appendChild(s);
</script>
</body>
</html>`;
}
