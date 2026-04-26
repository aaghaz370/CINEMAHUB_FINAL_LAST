"use client";

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const PROVIDERS = [
  { id: 'themovie', name: 'MovieBox', search: '/api/themovie/search?q=', det: '/api/themovie/det?url=', streamUrlKey: 'fullUrl', supportsStream: true },
  { id: 'animesalt', name: 'AnimeSalt', search: '/api/animesalt/search?q=', det: '/api/animesalt/details?url=', stream: '/api/animesalt/stream?url=', supportsStream: true },
  { id: 'hdhub4u', name: 'HDHub4u', search: '/api/hdhub4u?s=', det: '/api/hdhub4u/details?url=' },
  { id: '4khdhub', name: '4KHDHub', search: '/api/4khdhub?s=', det: '/api/4khdhub/details?url=' },
  { id: 'zeefliz', name: 'ZeeFliz', search: '/api/zeefliz?q=', det: '/api/zeefliz/details?url=' },
  { id: 'uhdmovies', name: 'UHDMovies', search: '/api/uhdmovies?q=', det: '/api/uhdmovies/details?url=' },
  { id: 'desiremovies', name: 'DesireMovies', search: '/api/desiremovies?q=', det: '/api/desiremovies/details?url=' },
  { id: 'movies4u', name: 'Movies4u', search: '/api/movies4u?q=', det: '/api/movies4u/details?url=' },
  { id: 'zinkmovies', name: 'ZinkMovies', search: '/api/zinkmovies/search?q=', det: '/api/zinkmovies/details?url=' },
  { id: 'mod', name: 'Mod/APKs', search: '/api/mod?q=', det: '/api/mod/details?url=' },
  { id: 'netmirror', name: 'NetMirror', search: '/api/netmirror?action=search&q=', det: '/api/netmirror?action=getpost&id=', usesId: true }
];

export default function DemoPlayer() {
  const [query, setQuery] = useState('batman');
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const [streams, setStreams] = useState<{url: string, label: string}[]>([]);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [activeDub, setActiveDub] = useState<string>(''); // For language Path details
  const [activeStream, setActiveStream] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hlsTracks, setHlsTracks] = useState<any[]>([]);
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [hlsInstance, setHlsInstance] = useState<any>(null);

  useEffect(() => {
    if (activeStream && videoRef.current) {
      const getProxyUrl = (url: string) => {
         const needsProxy = provider?.id === 'themovie' || provider?.id === 'animesalt';
         if (!needsProxy) return url;
         let ref = 'https://themoviebox.org/';
         if (provider?.id === 'animesalt') ref = 'https://animesalt.ac/';
         return `/api/proxy?url=${encodeURIComponent(url)}&req_referer=${encodeURIComponent(ref)}`;
      };

      const finalSrc = activeStream.includes('.m3u8') ? getProxyUrl(activeStream) : activeStream;

      if (activeStream.includes('.m3u8')) {
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = finalSrc;
        } else {
          const loadHls = () => {
             if ((window as any).Hls.isSupported()) {
                const hls = new (window as any).Hls({
                   xhrSetup: (xhr: any, url: string) => {
                      // Optionally add headers if needed
                   }
                });
                hls.loadSource(finalSrc);
                hls.attachMedia(videoRef.current!);
                hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
                   setHlsTracks(hls.audioTracks);
                   setHlsLevels(hls.levels);
                });
                setHlsInstance(hls);
             }
          };

          if (!(window as any).Hls) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
            script.onload = loadHls;
            document.body.appendChild(script);
          } else {
            loadHls();
          }
        }
      } else {
        videoRef.current.src = finalSrc;
      }
    }
    return () => {
       if (hlsInstance) hlsInstance.destroy();
    };
  }, [activeStream]);

  const switchAudio = (index: number) => {
     if (hlsInstance) hlsInstance.audioTrack = index;
  };

  const switchLevel = (index: number) => {
     if (hlsInstance) hlsInstance.currentLevel = index;
  };

  const extractItems = (data: any, pid: string) => {
    switch(pid) {
      case 'themovie': return data?.results || data?.movies || [];
      case 'hdhub4u': return data?.data?.recentMovies || data?.data?.results || [];
      case '4khdhub':
      case 'zeefliz':
      case 'mod': return data?.results || data?.data || [];
      case 'netmirror': return data?.data?.searchResults?.searchResult || [];
      default:
        for (const k of ['results', 'data', 'movies', 'items', 'searchResult']) {
          if (Array.isArray(data?.[k])) return data[k];
          if (Array.isArray(data?.data?.[k])) return data.data[k];
        }
        return [];
    }
  };

  const getUrl = (i: any, p: any) => {
    if (p.usesId) return i.id || i.v_id || i.post_id;
    if (p.id === 'themovie') return i.fullUrl || `https://themoviebox.org${i.href}`;
    return i.url || i.link || i.href;
  };

  const extractLinks = (obj: any): {url: string, label: string}[] => {
    let ls = new Map<string, string>();
    const walk = (o: any, parentInfo?: any) => {
      if (!o) return;
      
      const labelData = (parentInfo?.resolutions ? parentInfo.resolutions + 'p' : '') 
                     || (parentInfo?.quality ? parentInfo.quality : '') 
                     || (parentInfo?.label ? (parentInfo?.kind === 'captions' ? `Subtitle: ${parentInfo.label}` : parentInfo.label) : '')
                     || (parentInfo?.title || parentInfo?.name || '');

      if (typeof o === 'string' && o.startsWith('http')) {
         if (o.match(/\.(m3u8|mp4|mkv|vtt|srt)(\?.*)?$/i) || o.match(/drive|file|short\.icu|abyss|\/hls\//i)) {
             if (!ls.has(o) || (labelData && !ls.get(o))) {
                 ls.set(o, labelData || (o.includes('-sd') ? 'Trailer' : (o.includes('.vtt') || o.includes('.srt') ? 'Subtitle' : 'Direct Stream')));
             }
         }
      } else if (Array.isArray(o)) {
         o.forEach(item => walk(item, parentInfo));
      } else if (typeof o === 'object') {
         if (o.url && typeof o.url === 'string') walk(o.url, o);
         if (o.link && typeof o.link === 'string') walk(o.link, o);
         if (o.file && typeof o.file === 'string') walk(o.file, o);
         if (o.playApiUrl && typeof o.playApiUrl === 'string') walk(o.playApiUrl, o);
         
         Object.values(o).forEach(v => {
            if (typeof v === 'object' || Array.isArray(v)) {
               walk(v, o);
            } else if (typeof v === 'string' && v.startsWith('http')) {
               walk(v, o);
            }
         });
      }
    };
    walk(obj);
    return Array.from(ls.entries()).map(([url, label]) => ({url, label}));
  };

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true); setResults([]); setSelectedItem(null); setDetails(null); setActiveStream(''); setStreams([]);
    try {
      const { search } = provider;
      const res = await fetch(search + encodeURIComponent(query));
      const json = await res.json();
      setResults(extractItems(json, provider.id));
    } catch (e) {
      console.error(e);
      alert("Failed to search. Check console.");
    }
    setLoading(false);
  };

  const fetchDetailsForSelection = async (targetUrl: string, season?: number, episode?: number) => {
       let u = provider.det + encodeURIComponent(targetUrl);
       if (season) u += `&season=${season}`;
       if (episode) u += `&episode=${episode}`;
       const res = await fetch(u);
       return await res.json();
  };

  const loadEpisodeStreams = async (url: string, targetSeason: number, targetEp: number) => {
       setStreams([]);
       setActiveStream('');
       setLoadingDet(true);
       try {
           const json = await fetchDetailsForSelection(url, targetSeason, targetEp);
           // Prevent overwriting full details so the UI keeps season lists
           // We just extract links from the new response
           const links = extractLinks(json.watchOnline || json);
           setStreams(links);
           const playable = links.find(l => l.url.includes('.m3u8') || l.url.includes('.mp4') && !l.label.includes('Trailer'));
           if (playable) setActiveStream(playable.url);
       } catch (e) {
           console.error("Episode load error:", e);
       }
       setLoadingDet(false);
  };

  const handleSelect = async (item: any) => {
    setSelectedItem(item);
    setDetails(null);
    setStreams([]);
    setActiveStream('');
    setActiveSeason(1);
    setActiveEpisode(1);
    setActiveDub('');
    setLoadingDet(true);
    try {
      const targetUrl = getUrl(item, provider);
      
      // Step 2: Fetch Details
      if (provider.det) {
         const res = await fetch(provider.det + encodeURIComponent(targetUrl));
         const json = await res.json();
         setDetails(json);
         
         const links = extractLinks(json);
         setStreams(links);

         // Very basic logic to auto-active stream if M3U8/MP4 is found
         const playable = links.find(l => l.url.includes('.m3u8') || l.url.includes('.mp4'));
         if (playable) setActiveStream(playable.url);

         // Step 3: Specific Stream Extractors (AnimeSalt etc)
         if (provider.stream && json) {
             // For AnimeSalt, we might need episode id. Try feeding targetUrl directly if simple schema
             try {
                const sRes = await fetch(provider.stream + encodeURIComponent(targetUrl));
                const sJson = await sRes.json();
                const sLinks = extractLinks(sJson);
                
                // Merge unique streams
                setStreams(prev => {
                    const newLs = [...prev];
                    sLinks.forEach(sl => { if (!newLs.some(p => p.url === sl.url)) newLs.push(sl); });
                    return newLs;
                });

                const spl = sLinks.find(l => l.url.includes('.m3u8') || l.url.includes('.mp4'));
                if (spl && !playable) setActiveStream(spl.url);
             } catch(e) {}
         }
      }

    } catch (e) {
       console.error(e);
       alert("Failed to load details. Check network.");
    }
    setLoadingDet(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
       {/* HEADER */}
       <header className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4 shadow-xl">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">🎥 API Unified Explorer</h1>
            
            <div className="flex flex-1 w-full gap-2 relative">
               <input 
                 className="flex-1 bg-gray-800 border items-center border-gray-700 focus:border-purple-500 outline-none rounded-xl px-4 py-2 text-white shadow-inner transition-colors duration-200" 
                 type="text" 
                 placeholder="Search a movie or anime..."
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
               />
               <button onClick={handleSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-500 transition px-6 py-2 rounded-xl font-medium disabled:opacity-50">
                 {loading ? "..." : "Search"}
               </button>
            </div>
         </div>

         {/* PROVIDERS TABS */}
         <div className="max-w-6xl mx-auto mt-4 flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
            {PROVIDERS.map(p => (
              <button 
                key={p.id}
                onClick={() => { setProvider(p); setResults([]); setDetails(null); }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${provider.id === p.id ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
              >
                {p.name}
              </button>
            ))}
         </div>
       </header>

       <main className="max-w-6xl mx-auto pt-44 pb-10 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* SEARCH RESULTS COLUMN */}
          <div className="lg:col-span-1 space-y-4 h-[calc(100vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
             <h2 className="text-lg font-semibold border-b border-gray-800 pb-2">Results from {provider.name}</h2>
             {loading && <div className="text-gray-400 animate-pulse text-center mt-10">Scraping data...</div>}
             {!loading && results.length === 0 && <div className="text-gray-500 text-center mt-10">No items to show. Try a search!</div>}
             <div className="grid gap-3">
               {results.map((i, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleSelect(i)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedItem === i ? 'bg-gray-800 border-purple-500 shadow-md' : 'bg-gray-900 border-gray-800 hover:bg-gray-800 hover:border-gray-600'}`}
                  >
                    <div className="font-medium text-sm text-gray-100">{i.title || i.name || i.t || `Item ${idx}`}</div>
                    {(i.quality || i.language) && (
                      <div className="flex gap-2 mt-2 text-xs font-semibold text-gray-400">
                         {i.quality && <span className="bg-gray-700 px-2 py-0.5 rounded text-blue-400">{i.quality}</span>}
                         {i.language && <span className="bg-gray-700 px-2 py-0.5 rounded text-purple-400">{i.language}</span>}
                      </div>
                    )}
                  </div>
               ))}
             </div>
          </div>

          {/* PLAYER & DETAILS COLUMN */}
          <div className="lg:col-span-2 space-y-6">
             {/* PLAYER DOM */}
             <div className="w-full bg-black rounded-2xl overflow-hidden aspect-video border border-gray-800 shadow-2xl relative flex items-center justify-center group">
                <video 
                   ref={videoRef} 
                   controls 
                   autoPlay 
                   className="w-full h-full object-contain"
                   style={{ display: activeStream ? 'block' : 'none' }}
                />
                {!activeStream && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                         <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                      </div>
                      <p className="font-medium text-gray-400">No Stream Selected.</p>
                      <p className="text-sm mt-2 opacity-70">Search and click an item on the left to extract links.</p>
                   </div>
                )}
             </div>

             {/* HLS Selective Controls */}
             {(hlsTracks.length > 0 || hlsLevels.length > 0) && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-4">
                   {hlsTracks.length > 1 && (
                     <div>
                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Switch Audio Language</div>
                       <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          {hlsTracks.map((t, i) => (
                            <button 
                               key={i} 
                               onClick={() => switchAudio(i)}
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${hlsInstance?.audioTrack === i ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            > {t.name || t.lang || `Track ${i+1}`} </button>
                          ))}
                       </div>
                     </div>
                   )}
                   {hlsLevels.length > 1 && (
                     <div>
                       <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Change Quality</div>
                       <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                          <button 
                             onClick={() => switchLevel(-1)}
                             className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${hlsInstance?.currentLevel === -1 ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                          > AUTO </button>
                          {hlsLevels.map((l, i) => (
                            <button 
                               key={i} 
                               onClick={() => switchLevel(i)}
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${hlsInstance?.currentLevel === i ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            > {l.name || (l.height + 'p')} </button>
                          ))}
                       </div>
                     </div>
                   )}
                </div>
             )}

             {/* LINK EXTRACTOR UI */}
             <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                 <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">Deep Extractor</h2>
                 
                 {loadingDet ? (
                    <div className="flex items-center gap-3 text-gray-400 font-medium">
                       <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                       Extracting details & bypass links...
                    </div>
                 ) : !details ? (
                    <div className="text-gray-500">Awaiting selection.</div>
                 ) : (
                    <div className="space-y-4">
                       {(details.meta?.seasons || details.data?.seasons)?.length > 0 && (
                          <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl">
                              <h3 className="text-sm font-bold text-gray-300 mb-2">Series Navigation</h3>
                              
                              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-2">
                                 {Array.from(new Set((details.meta?.seasons || details.data?.seasons).map((s: any) => s.season || s.seasonNumber))).map((season: any) => (
                                    <button 
                                      key={`s${season}`}
                                      onClick={() => { setActiveSeason(season); setActiveEpisode(1); loadEpisodeStreams(getUrl(selectedItem, provider), season, 1); }}
                                      className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap ${activeSeason == season ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    > Season {season} </button>
                                 ))}
                              </div>

                              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                 {((details.meta?.seasons || details.data?.seasons).find((s: any) => (s.season || s.seasonNumber) == activeSeason)?.episodes) ? (
                                    // Handle nested episodes array (AnimeSalt format)
                                    ((details.meta?.seasons || details.data?.seasons).find((s: any) => (s.season || s.seasonNumber) == activeSeason)?.episodes || []).map((ep: any) => (
                                       <button 
                                         key={`e${ep.number}`}
                                         onClick={async () => {
                                            setActiveEpisode(ep.number);
                                            setLoadingDet(true);
                                            try {
                                               const epUrl = ep.link.startsWith('http') ? ep.link : `https://animesalt.ac${ep.link}`;
                                               const sRes = await fetch(provider.stream + encodeURIComponent(epUrl));
                                               const sJson = await sRes.json();
                                               const links = extractLinks(sJson);
                                               setStreams(links);
                                               const playable = links.find(l => l.url.includes('.m3u8') || l.url.includes('.mp4'));
                                               if (playable) setActiveStream(playable.url);
                                            } catch (e) {
                                               console.error(e);
                                            }
                                            setLoadingDet(false);
                                         }}
                                         className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap min-w-[3rem] ${activeEpisode == ep.number ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                       > Ep {ep.number} </button>
                                    ))
                                 ) : (
                                    // Handle flat map of seasons items (MovieBox format)
                                    (details.meta?.seasons || details.data?.seasons).filter((s: any) => s.season == activeSeason).map((ep: any) => (
                                       <button 
                                         key={`e${ep.episode}`}
                                         onClick={() => { setActiveEpisode(ep.episode); loadEpisodeStreams(getUrl(selectedItem, provider), activeSeason, ep.episode); }}
                                         className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap min-w-[3rem] ${activeEpisode == ep.episode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                       > Ep {ep.episode} </button>
                                    ))
                                 )}
                              </div>
                              
                              {details.meta?.dubs && details.meta.dubs.length > 0 && (
                                <div className="mt-3 border-t border-gray-800 pt-3">
                                   <h3 className="text-xs font-bold text-gray-500 mb-2">Dubbed Languages</h3>
                                   <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                                      {details.meta.dubs.map((dub: any, idx: number) => (
                                         <button 
                                            key={idx}
                                            onClick={() => loadEpisodeStreams(`https://themoviebox.org/moviesDetail/${dub.detailPath}?id=${dub.subjectId}`, activeSeason, activeEpisode)}
                                            className="px-2 py-1 rounded bg-gray-800 text-gray-300 text-[10px] hover:bg-purple-500 hover:text-white"
                                         > {dub.name} </button>
                                      ))}
                                   </div>
                                </div>
                              )}
                          </div>
                       )}

                       <div className="text-sm text-gray-300">
                          {streams.length} Links Found
                       </div>
                       
                       {streams.length > 0 ? (
                          <div className="grid gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                             {streams.map((s, idx) => (
                                <div key={idx} className={`flex items-center bg-gray-950 border rounded-lg p-2.5 transition-colors ${activeStream === s.url ? 'border-purple-500 shadow-md shadow-purple-500/20' : 'border-gray-800 hover:border-blue-500'}`}>
                                   <div className="flex-1 flex flex-col mr-3 overflow-hidden">
                                       <span className="text-sm font-semibold text-gray-200">
                                            {s.label.includes('p') ? `Quality: ${s.label}` : s.label}
                                       </span>
                                       <span className="truncate text-xs text-blue-300 font-mono mt-1 opacity-70" title={s.url}>{s.url}</span>
                                   </div>
                                   {/* Attempt to play M3U8/MP4 */}
                                   {(s.url.includes('.m3u8') || s.url.includes('.mp4')) ? (
                                      <button 
                                        onClick={() => setActiveStream(s.url)} 
                                        className={`text-xs px-3 py-1.5 rounded-md font-bold transition ${activeStream === s.url ? 'bg-purple-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                      > {activeStream === s.url ? 'Playing' : 'Play'} </button>
                                   ) : (
                                      <a 
                                        href={s.url} target="_blank" rel="noreferrer"
                                        className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1.5 rounded-md font-medium transition"
                                      > Open </a>
                                   )}
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                             Oops! Could not automatically detect playable or downloadable `http` sequences in the JSON tree. 
                             This provider might employ advanced obfuscation or strictly redirect architecture.
                          </div>
                       )}

                       <details className="mt-4 border border-gray-800 rounded-xl overflow-hidden group">
                           <summary className="p-3 bg-gray-950 text-sm font-medium cursor-pointer flex justify-between items-center hover:bg-gray-800 transition">
                             Raw API JSON Dump
                           </summary>
                           <div className="p-3 bg-gray-950 text-xs font-mono text-gray-400 whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar">
                             {JSON.stringify(details, null, 2)}
                           </div>
                       </details>
                    </div>
                 )}
             </div>

          </div>
       </main>

       <style dangerouslySetInnerHTML={{__html: `
         .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
       `}} />
    </div>
  );
}
