'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Star, Clock, Calendar, ChevronLeft, Tv, Film, Users, Volume2, Settings2, Loader2 } from 'lucide-react';

interface StreamLink {
  url: string;
  quality: string;
  language: string;
  format: 'mp4' | 'm3u8' | 'bypass';
  server?: string;
  provider: string;
}

interface CastMember {
  name: string;
  character: string;
  profile: string | null;
}

interface MediaDetail {
  tmdbId: string;
  type: string;
  title: string;
  year: string;
  overview: string;
  poster: string | null;
  backdrop: string | null;
  vote_average: number;
  vote_count: number;
  genres: string[];
  runtime: number | null;
  status: string;
  cast: CastMember[];
  trailer: string | null;
  seasons: any[] | null;
  links: StreamLink[];
  linkSummary: Record<string, { qualities: string[]; count: number }>;
  totalSources: number;
  totalLinks: number;
}

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const type = (params.type as string) || 'movie';

  const [detail, setDetail] = useState<MediaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [linksLoading, setLinksLoading] = useState(true);

  // Player state
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedLink, setSelectedLink] = useState<StreamLink | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        // First get TMDB metadata quickly
        const res = await fetch(`/api/details?id=${id}&type=${type}`);
        const json = await res.json();
        if (json.success) {
          setDetail(json.data);
          // Set default lang/quality if links already present
          if (json.data.links?.length > 0) {
            const langs = [...new Set(json.data.links.map((l: StreamLink) => l.language))];
            const preferred = ['Hindi', 'Multi', 'English'].find(l => langs.includes(l)) || langs[0];
            setSelectedLang(preferred as string);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setLinksLoading(false);
      }
    }
    load();
  }, [id, type]);

  // Derive filtered links for current language
  const availableLangs = detail ? [...new Set(detail.links.map(l => l.language))] : [];
  const linksForLang = detail?.links.filter(l => l.language === selectedLang) || [];
  const availableQualities = [...new Set(linksForLang.map(l => l.quality))];
  const linksForQuality = linksForLang.filter(l => l.quality === selectedQuality);

  function handlePlay() {
    // Pick best link: prefer mp4 > m3u8 > bypass
    const best = linksForQuality.find(l => l.format === 'mp4')
      || linksForQuality.find(l => l.format === 'm3u8')
      || linksForQuality[0]
      || detail?.links[0];
    if (best) {
      setSelectedLink(best);
      setShowPlayer(true);
    }
  }

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
      {showPlayer && selectedLink && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center" onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-5xl px-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-white font-bold">{detail.title} — {selectedLang} {selectedLink.quality}</h2>
              <button onClick={() => setShowPlayer(false)} className="text-white/60 hover:text-white text-lg">✕</button>
            </div>
            {selectedLink.format === 'mp4' ? (
              <video
                src={selectedLink.url}
                controls
                autoPlay
                className="w-full rounded-2xl"
                style={{ maxHeight: '75vh', background: '#000' }}
              >
                Your browser does not support video.
              </video>
            ) : selectedLink.format === 'm3u8' ? (
              <HlsPlayer url={selectedLink.url} proxiedUrl={`/api/proxy?url=${encodeURIComponent(selectedLink.url)}`} />
            ) : (
              <div className="w-full rounded-2xl p-8 text-center" style={{ background: '#111' }}>
                <p className="text-white mb-4">This link requires external processing.</p>
                <a href={selectedLink.url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl font-bold text-white" style={{ background: 'var(--accent)' }}>
                  Open Link
                </a>
              </div>
            )}
            {/* Quality / Language Switcher in player */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {availableLangs.map(lang => (
                <button key={lang} onClick={() => { setSelectedLang(lang); setSelectedQuality(availableQualities[0] || ''); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedLang === lang ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: 'white' }}>
                  {lang}
                </button>
              ))}
              <span className="text-white/20">|</span>
              {availableQualities.map(q => (
                <button key={q} onClick={() => setSelectedQuality(q)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: selectedQuality === q ? '#facc14' : 'rgba(255,255,255,0.1)', color: selectedQuality === q ? '#000' : 'white' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BACKDROP ── */}
      {detail.backdrop && (
        <div className="relative -mx-4 md:-mx-8 h-[55vh] min-h-[350px] overflow-hidden mb-8">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${detail.backdrop})`, filter: 'brightness(0.4)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 60%)' }} />
          <div className="absolute top-4 left-4">
            <button onClick={() => router.back()} className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
              <ChevronLeft size={16} /> Back
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* ── POSTER ── */}
          <div className="shrink-0">
            {detail.poster ? (
              <img src={detail.poster} alt={detail.title} className="w-44 md:w-56 rounded-2xl shadow-2xl" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
            ) : (
              <div className="w-44 md:w-56 aspect-[2/3] rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                <Film size={40} style={{ color: 'var(--text-secondary)' }} />
              </div>
            )}
          </div>

          {/* ── META ── */}
          <div className="flex-1 space-y-4 pt-4 md:pt-8">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {detail.type === 'tv' ? <Tv size={14} /> : <Film size={14} />}
              <span className="uppercase font-bold tracking-wider">{detail.type === 'tv' ? 'Series' : 'Movie'}</span>
              {detail.year && <><span>•</span><span>{detail.year}</span></>}
              {detail.runtime && <><span>•</span><Clock size={13} /><span>{detail.runtime} min</span></>}
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{detail.title}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              {detail.vote_average > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <Star size={16} fill="currentColor" /> {detail.vote_average.toFixed(1)}
                  <span className="text-xs font-normal opacity-60" style={{ color: 'var(--text-secondary)' }}>({detail.vote_count?.toLocaleString()} votes)</span>
                </span>
              )}
              {detail.genres.slice(0, 4).map(g => (
                <span key={g} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{g}</span>
              ))}
            </div>
            <p className="text-sm md:text-base leading-relaxed line-clamp-4" style={{ color: 'var(--text-secondary)' }}>{detail.overview}</p>

            {/* ── STREAM CONTROLS ── */}
            <div className="pt-2 space-y-4">
              {linksLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="animate-spin" /> Finding stream sources...
                </div>
              ) : detail.links.length === 0 ? (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  No direct streams found. Try again later.
                </div>
              ) : (
                <>
                  {/* Language selector */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Volume2 size={13} /> Language
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableLangs.map(lang => (
                        <button key={lang} onClick={() => { setSelectedLang(lang); setSelectedQuality(availableQualities[0] || ''); }}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                          style={{ background: selectedLang === lang ? 'var(--accent)' : 'var(--bg-secondary)', color: selectedLang === lang ? 'white' : 'var(--text-secondary)', boxShadow: selectedLang === lang ? '0 4px 16px var(--accent-glow)' : 'none' }}>
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality selector */}
                  {selectedLang && (
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
                  )}

                  {/* Play button */}
                  <div className="flex gap-3 flex-wrap pt-2">
                    <button onClick={handlePlay} disabled={!selectedLang}
                      className="flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-white text-base transition-all hover:scale-105 disabled:opacity-40"
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

                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {detail.totalSources} source{detail.totalSources !== 1 ? 's' : ''} • {detail.totalLinks} stream{detail.totalLinks !== 1 ? 's' : ''} found
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── CAST ── */}
        {detail.cast.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={20} style={{ color: 'var(--accent)' }} /> Cast
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none' }}>
              {detail.cast.map((member, idx) => (
                <div key={idx} className="shrink-0 flex flex-col items-center gap-2 w-24 text-center">
                  {member.profile ? (
                    <img src={member.profile} alt={member.name} className="w-16 h-16 rounded-full object-cover" style={{ border: '2px solid var(--border)' }} />
                  ) : (
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl" style={{ background: 'var(--bg-secondary)' }}>👤</div>
                  )}
                  <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                  <p className="text-[10px] line-clamp-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>{member.character}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── HLS Player Component ──
function HlsPlayer({ url, proxiedUrl }: { url: string, proxiedUrl?: string }) {
  const streamUrl = proxiedUrl || url;
  
  useEffect(() => {
    const video = document.getElementById('hls-video') as HTMLVideoElement;
    if (!video) return;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          return () => hls.destroy();
        }
      });
    }
  }, [streamUrl]);

  return (
    <video id="hls-video" controls autoPlay className="w-full rounded-2xl" style={{ maxHeight: '75vh', background: '#000' }}>
      Your browser does not support video playback.
    </video>
  );
}
