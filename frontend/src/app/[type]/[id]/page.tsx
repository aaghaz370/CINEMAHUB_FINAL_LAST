'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Play, Star, Clock, ChevronLeft, Tv, Film, Users,
  Volume2, Settings2, Loader2, AlertCircle, ExternalLink
} from 'lucide-react';

interface Source {
  provider: string;
  id: string;
  title: string;
  postUrl: string;
  language: string;
}

interface CastMember { name: string; character: string; profile: string | null; }

interface MediaDetail {
  tmdbId: string; type: string; title: string; year: string;
  overview: string; poster: string | null; backdrop: string | null;
  vote_average: number; vote_count: number; genres: string[];
  runtime: number | null; status: string; cast: CastMember[];
  trailer: string | null; seasons: any[] | null;
  sources: Source[]; totalSources: number;
}

// Detect language from provider source
function srcLangs(src: Source): string[] {
  const raw = (src.language || src.title || '').toLowerCase();
  const langs: string[] = [];
  if (raw.includes('hindi') || raw.includes('hin')) langs.push('Hindi');
  if (raw.includes('telugu')) langs.push('Telugu');
  if (raw.includes('tamil')) langs.push('Tamil');
  if (raw.includes('malayalam')) langs.push('Malayalam');
  if (raw.includes('english') || raw.includes('eng')) langs.push('English');
  if (raw.includes('multi') || raw.includes('dual')) langs.push('Multi');
  if (langs.length === 0) langs.push('Multi');
  return langs;
}

const QUALITY_OPTIONS = ['4K', '1080p', '720p', '480p', 'HD'];
const PROVIDER_LABELS: Record<string, string> = {
  themovie: 'MovieBox', netmirror: 'NetMirror', hdhub4u: 'HDHub4u',
  mod: 'MoviesMod', vega: 'VegaMovies', '4khdhub': '4KHDHub',
  kmmovies: 'KMMovies', desiremovies: 'DesireMovies',
};

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const type = (params.type as string) || 'movie';

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Player state
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedLang, setSelectedLang] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamFormat, setStreamFormat] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/details?id=${id}&type=${type}`)
      .then(r => r.json())
      .then(json => { if (json.success) setDetail(json.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, type]);

  // Collect all unique languages from sources
  const allLangs = detail
    ? [...new Set(detail.sources.flatMap(srcLangs))]
    : [];

  // Set default language
  useEffect(() => {
    if (allLangs.length && !selectedLang) {
      const pref = ['Hindi', 'Multi', 'Telugu', 'English'].find(l => allLangs.includes(l)) || allLangs[0];
      setSelectedLang(pref);
    }
  }, [allLangs.length]);

  // Sources that support selected language
  const sourcesForLang = detail?.sources.filter(s => {
    const langs = srcLangs(s);
    return langs.includes(selectedLang) || langs.includes('Multi');
  }) || [];

  async function handlePlay() {
    if (!detail || sourcesForLang.length === 0) return;
    setStreamError('');
    setStreamLoading(true);
    setStreamUrl('');
    setShowPlayer(true);

    // Try each source until one works
    for (const src of sourcesForLang) {
      try {
        const url = `/api/stream?provider=${src.provider}&postUrl=${encodeURIComponent(src.postUrl)}&lang=${encodeURIComponent(selectedLang)}&quality=${encodeURIComponent(selectedQuality)}`;
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          const fmt = ct.includes('mpegurl') ? 'm3u8' : 'mp4';
          setStreamUrl(url);
          setStreamFormat(fmt);
          setStreamLoading(false);
          return;
        }
      } catch {}
    }
    setStreamError(`No stream found for ${selectedLang} ${selectedQuality}. Try different language or quality.`);
    setStreamLoading(false);
  }

  // Initialize HLS player when streamUrl changes
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Clean up previous HLS instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (streamFormat === 'm3u8') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch(() => {});
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            const hls = new Hls({ xhrSetup: (xhr: any) => { xhr.withCredentials = false; } });
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (data.fatal) setStreamError('Stream failed. Try different quality.');
            });
            hlsRef.current = hls;
          }
        });
      }
    } else {
      video.src = streamUrl;
      video.play().catch(() => {});
    }
  }, [streamUrl, streamFormat]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
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
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center" onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-5xl px-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h2 className="text-white font-bold text-lg">{detail.title}</h2>
                <p className="text-white/50 text-xs">{selectedLang} · {selectedQuality}</p>
              </div>
              <button onClick={() => setShowPlayer(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-white bg-white/10 hover:bg-white/20">✕</button>
            </div>

            {/* Player */}
            <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {streamLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={36} className="animate-spin text-white/60" />
                  <p className="text-white/60 text-sm">Finding best stream for {selectedLang} {selectedQuality}...</p>
                </div>
              )}
              {streamError && !streamLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                  <AlertCircle size={36} className="text-red-400" />
                  <p className="text-white/70 text-sm text-center">{streamError}</p>
                  {detail.trailer && (
                    <a href={`https://youtube.com/watch?v=${detail.trailer}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: 'var(--accent)' }}>
                      <ExternalLink size={14} /> Watch Trailer
                    </a>
                  )}
                </div>
              )}
              <video
                ref={videoRef}
                controls
                className="w-full h-full"
                style={{ display: streamUrl && !streamError ? 'block' : 'none' }}
                crossOrigin="anonymous"
              />
            </div>

            {/* In-player controls */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {allLangs.map(lang => (
                <button key={lang} onClick={() => { setSelectedLang(lang); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedLang === lang ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: 'white' }}>
                  {lang}
                </button>
              ))}
              <span className="text-white/20">|</span>
              {QUALITY_OPTIONS.map(q => (
                <button key={q} onClick={() => setSelectedQuality(q)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedQuality === q ? '#facc14' : 'rgba(255,255,255,0.1)', color: selectedQuality === q ? '#000' : 'white' }}>
                  {q}
                </button>
              ))}
              <button onClick={handlePlay} className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                style={{ background: 'var(--accent)' }}>
                <Play size={12} fill="white" /> Reload
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
              ? <img src={detail.poster} alt={detail.title} className="w-44 md:w-56 rounded-2xl shadow-2xl" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
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
              {detail.totalSources === 0 ? (
                <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  No sources found for this title.
                </div>
              ) : (
                <>
                  {/* Language */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Volume2 size={13} /> Language
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {allLangs.map(lang => (
                        <button key={lang} onClick={() => setSelectedLang(lang)}
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
                      {QUALITY_OPTIONS.map(q => (
                        <button key={q} onClick={() => setSelectedQuality(q)}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                          style={{ background: selectedQuality === q ? '#facc14' : 'var(--bg-secondary)', color: selectedQuality === q ? '#000' : 'var(--text-secondary)' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Play + Source list */}
                  <div className="flex gap-3 flex-wrap pt-2 items-center">
                    <button onClick={handlePlay}
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

                  {/* Available sources */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {detail.sources.map(s => (
                      <span key={s.provider} className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                        {PROVIDER_LABELS[s.provider] || s.provider}
                      </span>
                    ))}
                  </div>
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
