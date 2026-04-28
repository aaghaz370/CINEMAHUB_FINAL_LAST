'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Play, Star, Clock, ChevronLeft, Tv, Film, Users,
  Volume2, Settings2, Loader2, AlertCircle, ExternalLink, RefreshCw
} from 'lucide-react';

interface StreamLink {
  url: string; quality: string; language: string;
  format: 'mp4' | 'm3u8' | 'bypass'; provider: string;
}
interface CastMember { name: string; character: string; profile: string | null; }
interface MediaDetail {
  tmdbId: string; type: string; title: string; year: string;
  overview: string; poster: string | null; backdrop: string | null;
  vote_average: number; vote_count: number; genres: string[];
  runtime: number | null; status: string; cast: CastMember[];
  trailer: string | null; seasons: any[] | null;
  links: StreamLink[]; linkSummary: Record<string, { qualities: string[]; count: number }>;
  availableLanguages: string[]; totalSources: number; totalLinks: number;
}

const QUALITY_ORDER = ['4K', '2160p', '1080p', 'Full HD', '720p', 'Mid HD', '480p', 'Low HD', '360p', 'HD', 'Auto'];

function rankQ(q: string) { return QUALITY_ORDER.indexOf(q) === -1 ? 99 : QUALITY_ORDER.indexOf(q); }

const PROVIDER_LABEL: Record<string, string> = {
  themovie: 'MovieBox', netmirror: 'NetMirror', hdhub4u: 'HDHub4u',
  mod: 'MoviesMod', vega: 'VegaMovies', '4khdhub': '4KHDHub',
  kmmovies: 'KMMovies', desiremovies: 'DesireMovies', modlist: 'MoviesLeech',
};

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const type = (params.type as string) || 'movie';

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(true);

  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [activeLink, setActiveLink] = useState<StreamLink | null>(null);
  const [playerError, setPlayerError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLinksLoading(true);
    fetch(`/api/details?id=${id}&type=${type}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          const d = json.data as MediaDetail;
          setDetail(d);
          // Set preferred language
          const pref = ['Hindi', 'Telugu', 'Tamil', 'Multi', 'English', 'Original']
            .find(l => d.availableLanguages.includes(l)) || d.availableLanguages[0] || '';
          setSelectedLang(pref);
          // Set quality from that language's available qualities
          const quals = d.linkSummary[pref]?.qualities || ['1080p'];
          const qPref = QUALITY_ORDER.find(q => quals.includes(q)) || quals[0] || '1080p';
          setSelectedQuality(qPref);
          setLinksLoading(false);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, type]);

  // Links for selected language
  const linksForLang = detail?.links.filter(l => l.language === selectedLang) || [];
  // Available qualities for this language
  const availableQualities = detail?.linkSummary[selectedLang]?.qualities || [...new Set(linksForLang.map(l => l.quality))];

  // Best link for current selection (prefer mp4 > m3u8 > bypass, skip known-blocked CDNs)
  function getBestLink(lang: string, quality: string): StreamLink | null {
    if (!detail) return null;
    // hakunaymatata.com is IP-locked to the Vercel backend IP — skip it
    const BLOCKED_CDNS = ['hakunaymatata.com'];
    const isBlocked = (url: string) => BLOCKED_CDNS.some(cdn => url.includes(cdn));
    
    const candidates = detail.links.filter(l => l.language === lang && l.quality === quality && !isBlocked(l.url));
    // If nothing at requested quality, try any quality for this lang
    const pool = candidates.length > 0 ? candidates : detail.links.filter(l => l.language === lang && !isBlocked(l.url));
    return pool.find(l => l.format === 'mp4')
      || pool.find(l => l.format === 'm3u8')
      || pool[0] || null;
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';

  function buildProxyUrl(link: StreamLink): string {
    // If it's already a backend proxy URL, use it directly (avoid double-proxying)
    if (link.url.includes(`${API_BASE}/api/`) || link.url.includes('cinemahub-api.vercel.app/api/')) {
      return link.url;
    }
    // For m3u8: use frontend proxy (rewrites playlist + CORS)
    if (link.format === 'm3u8') {
      const ref = encodeURIComponent('https://themoviebox.org/');
      return `/api/proxy?url=${encodeURIComponent(link.url)}&req_referer=${ref}`;
    }
    // For mp4: use backend proxy with correct referer (same Vercel deployment = same IP range)
    const ref = encodeURIComponent('https://themoviebox.org/');
    return `${API_BASE}/api/proxy?url=${encodeURIComponent(link.url)}&req_referer=${ref}`;
  }

  function handlePlay(lang?: string, quality?: string) {
    const useLang = lang || selectedLang;
    const useQuality = quality || selectedQuality;
    const link = getBestLink(useLang, useQuality);
    if (!link) { setPlayerError('No stream found for this combination.'); setShowPlayer(true); return; }
    setPlayerError('');
    setActiveLink(link);
    setShowPlayer(true);
  }

  // Wire up video/HLS player when activeLink changes
  useEffect(() => {
    if (!activeLink || !showPlayer) return;
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (activeLink.format === 'bypass') return;

    const src = buildProxyUrl(activeLink);

    if (activeLink.format === 'm3u8') {
      // Set crossOrigin for HLS (needs CORS for XHR chunk fetching)
      video.crossOrigin = 'anonymous';
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.play().catch(() => {});
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) setPlayerError('HLS stream failed. Try another quality.');
            });
            hlsRef.current = hls;
          }
        });
      }
    } else {
      // mp4 — remove crossOrigin so browser does NOT enforce CORS (allows gadgetsweb, etc.)
      video.removeAttribute('crossorigin');
      // Use backend proxy directly (avoids CORS, same Vercel IP range)
      video.src = src;
      video.play().catch(() => {});
    }
  }, [activeLink, showPlayer]);

  if (loading) {
    return <div className="flex items-center justify-center h-[70vh]"><Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)' }} /></div>;
  }
  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Media not found</p>
        <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm" style={{ background: 'var(--accent)', color: 'white' }}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* ── PLAYER OVERLAY ── */}
      {showPlayer && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.97)' }} onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-5xl px-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-white font-bold">{detail.title}</h2>
                <p className="text-white/50 text-xs">{selectedLang} · {selectedQuality}{activeLink ? ` · ${activeLink.provider}` : ''}</p>
              </div>
              <button onClick={() => setShowPlayer(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-white bg-white/10 hover:bg-white/20 text-lg">✕</button>
            </div>

            {/* Video or bypass or error */}
            <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {activeLink?.format === 'bypass' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <ExternalLink size={36} className="text-white/60" />
                  <p className="text-white/70 text-sm">This stream requires an external player.</p>
                  <a href={activeLink.url} target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'var(--accent)' }}>
                    Open Stream Link
                  </a>
                </div>
              ) : playerError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                  <AlertCircle size={36} className="text-red-400" />
                  <p className="text-white/70 text-sm text-center">{playerError}</p>
                </div>
              ) : (
                // No crossOrigin attr on the video element itself — it's set dynamically per format
                <video ref={videoRef} controls autoPlay playsInline
                  className="w-full h-full bg-black"
                  onError={() => setPlayerError('Stream unavailable. Try different quality or language.')}
                />
              )}
            </div>

            {/* In-player selectors */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {detail.availableLanguages.map(lang => (
                <button key={lang}
                  onClick={() => { setSelectedLang(lang); const q = detail.linkSummary[lang]?.qualities[0] || selectedQuality; setSelectedQuality(q); handlePlay(lang, q); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedLang === lang ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: 'white' }}>
                  {lang}
                </button>
              ))}
              <span className="text-white/20">|</span>
              {availableQualities.map(q => (
                <button key={q}
                  onClick={() => { setSelectedQuality(q); handlePlay(selectedLang, q); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedQuality === q ? '#facc14' : 'rgba(255,255,255,0.1)', color: selectedQuality === q ? '#000' : 'white' }}>
                  {q}
                </button>
              ))}
              <button onClick={() => handlePlay()} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BACKDROP ── */}
      {detail.backdrop && (
        <div className="relative -mx-4 md:-mx-8 h-[55vh] min-h-[350px] overflow-hidden mb-8">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${detail.backdrop})`, filter: 'brightness(0.35)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 55%)' }} />
          <button onClick={() => router.back()} className="absolute top-4 left-4 flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster */}
          <div className="shrink-0">
            {detail.poster
              ? <img src={detail.poster} alt={detail.title} className="w-44 md:w-56 rounded-2xl" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
              : <div className="w-44 md:w-56 aspect-[2/3] rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><Film size={40} style={{ color: 'var(--text-secondary)' }} /></div>
            }
          </div>

          {/* Meta */}
          <div className="flex-1 space-y-4 pt-4 md:pt-8">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {detail.type === 'tv' ? <Tv size={14} /> : <Film size={14} />}
              <span className="uppercase font-bold tracking-wider">{detail.type === 'tv' ? 'Series' : 'Movie'}</span>
              {detail.year && <><span>•</span><span>{detail.year}</span></>}
              {detail.runtime && <><span>•</span><Clock size={13} /><span>{detail.runtime} min</span></>}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{detail.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              {detail.vote_average > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Star size={16} fill="currentColor" /> {detail.vote_average.toFixed(1)}
                  <span className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>({detail.vote_count?.toLocaleString()})</span>
                </span>
              )}
              {detail.genres.slice(0, 4).map(g => (
                <span key={g} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{g}</span>
              ))}
            </div>
            <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'var(--text-secondary)' }}>{detail.overview}</p>

            {/* Stream Controls */}
            <div className="pt-2 space-y-4">
              {linksLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="animate-spin" /> Finding streams...
                </div>
              ) : detail.totalLinks === 0 ? (
                <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  No streams found. Try again later.
                </div>
              ) : (
                <>
                  {/* Language */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Volume2 size={13} /> Language
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.availableLanguages.map(lang => (
                        <button key={lang} onClick={() => {
                          setSelectedLang(lang);
                          const qs = detail.linkSummary[lang]?.qualities || [];
                          const qPref = QUALITY_ORDER.find(q => qs.includes(q)) || qs[0] || '1080p';
                          setSelectedQuality(qPref);
                        }}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                          style={{ background: selectedLang === lang ? 'var(--accent)' : 'var(--bg-secondary)', color: selectedLang === lang ? 'white' : 'var(--text-secondary)', boxShadow: selectedLang === lang ? '0 4px 16px var(--accent-glow)' : 'none' }}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Settings2 size={13} /> Quality
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableQualities.map(q => (
                        <button key={q} onClick={() => setSelectedQuality(q)}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                          style={{ background: selectedQuality === q ? '#facc14' : 'var(--bg-secondary)', color: selectedQuality === q ? '#000' : 'var(--text-secondary)' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Play + Trailer */}
                  <div className="flex gap-3 flex-wrap pt-2 items-center">
                    <button onClick={() => handlePlay()}
                      className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-white text-base transition-all hover:scale-105"
                      style={{ background: 'var(--accent)', boxShadow: '0 6px 30px var(--accent-glow)' }}>
                      <Play size={18} fill="white" /> Watch Now
                    </button>
                    {detail.trailer && (
                      <a href={`https://youtube.com/watch?v=${detail.trailer}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:scale-105"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                        ▶ Trailer
                      </a>
                    )}
                  </div>

                  {/* Stats */}
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {detail.totalSources} sources · {detail.totalLinks} streams
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cast */}
        {detail.cast.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={20} style={{ color: 'var(--accent)' }} /> Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
              {detail.cast.map((m, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center gap-2 w-24 text-center">
                  {m.profile
                    ? <img src={m.profile} alt={m.name} className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
                    : <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl" style={{ background: 'var(--bg-secondary)' }}>👤</div>
                  }
                  <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-[10px] opacity-60 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{m.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
