'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Plus, Star, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface MediaItem {
  tmdb_id?: number;
  id?: number;
  title: string;
  type: string;
  poster?: string | null;
  poster_path?: string | null;
  backdrop?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  vote_average?: number;
  overview?: string;
}

function getPoster(item: MediaItem) {
  return item.poster || item.poster_path || null;
}
function getBackdrop(item: MediaItem) {
  return item.backdrop || item.backdrop_path || null;
}
function getId(item: MediaItem) {
  return item.tmdb_id || item.id || Math.random();
}

export default function Home() {
  const [heroItems, setHeroItems] = useState<MediaItem[]>([]);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [sections, setSections] = useState<{ title: string; items: MediaItem[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function loadData() {
      try {
        // Use our server-side proxy (no CORS issues)
        const res = await fetch('/api/home');
        const json = await res.json();

        let allItems: MediaItem[] = [];

        if (json?.data?.sections && Array.isArray(json.data.sections)) {
          // Build rows from sections
          const rows = json.data.sections
            .filter((s: any) => s?.items && s.items.length > 0)
            .map((s: any) => ({ title: s.title || 'Featured', items: s.items }));
          setSections(rows);

          // Use explicit trending if available, else flatten all items
          if (json.data.trending && json.data.trending.length > 0) {
            allItems = json.data.trending;
          } else {
            allItems = rows.flatMap((r: any) => r.items);
          }
        }

        // Pick top 5 with backdrops for hero carousel
        const withBackdrops = allItems.filter((m) => getBackdrop(m));
        setHeroItems(withBackdrops.slice(0, 5));

      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-slide hero
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIdx((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroItems]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Loading CinemaHub...</p>
      </div>
    );
  }

  const activeHero = heroItems[activeHeroIdx];

  return (
    <div className="space-y-12">

      {/* ── HERO CAROUSEL ── */}
      {activeHero ? (
        <section className="relative h-[65vh] min-h-[420px] max-h-[700px] rounded-[32px] overflow-hidden">

          {/* Background layers with crossfade */}
          {heroItems.map((item, idx) => (
            <div
              key={getId(item)}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: `url(${getBackdrop(item)})`,
                opacity: idx === activeHeroIdx ? 1 : 0,
                zIndex: idx === activeHeroIdx ? 1 : 0
              }}
            />
          ))}

          {/* Gradient overlays */}
          <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 50%)' }} />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

          {/* Pagination Dots */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveHeroIdx(idx)}
                className="w-1.5 rounded-full transition-all duration-500"
                style={{
                  background: 'white',
                  opacity: idx === activeHeroIdx ? 1 : 0.3,
                  height: idx === activeHeroIdx ? '32px' : '8px'
                }}
              />
            ))}
          </div>

          {/* Glass Info Card */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[88%] max-w-xl">
            <div className="flex items-stretch rounded-[20px] overflow-hidden border border-white/10 shadow-2xl" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)' }}>
              {/* Vertical label */}
              <div className="flex items-center justify-center px-3 border-r border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <span className="text-[9px] font-black tracking-[0.35em] text-white/40 uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  {activeHero.type === 'movie' ? 'MOVIE' : 'SERIES'}
                </span>
              </div>
              {/* Content */}
              <div className="flex-1 px-5 py-4 flex flex-col items-center text-center gap-3">
                <h1 className="text-xl md:text-3xl font-black text-white tracking-tighter line-clamp-2 drop-shadow-lg">
                  {activeHero.title}
                </h1>
                <div className="flex items-center gap-3">
                  <Link href={`/${activeHero.type}/${getId(activeHero)}`} className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-white text-sm transition-all hover:scale-105" style={{ background: '#e50914', boxShadow: '0 0 20px rgba(229,9,20,0.4)' }}>
                    <Play size={15} fill="white" /> {t('watch_now')}
                  </Link>
                  <Link href={`/${activeHero.type}/${getId(activeHero)}`} className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-black text-sm transition-all hover:scale-105" style={{ background: '#fbbf24' }}>
                    Details
                  </Link>
                  <button className="flex items-center justify-center w-9 h-9 rounded-full text-white border border-white/20 hover:bg-white/20 transition-all" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <Plus size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        // Fallback if no backdrop images
        <div className="h-48 rounded-[32px] flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Content loading from providers...</p>
        </div>
      )}

      {/* ── DYNAMIC CONTENT ROWS ── */}
      {sections.length > 0 ? (
        sections.map((section, i) => (
          <MediaRow key={i} title={section.title} items={section.items} isTop10={section.title.toLowerCase().includes('top 10') || section.title.toLowerCase().includes('top10')} />
        ))
      ) : (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
          <p className="text-lg font-semibold">No content available yet.</p>
          <p className="text-sm mt-2">Backend providers may be loading. Try refreshing in a moment.</p>
        </div>
      )}

    </div>
  );
}

// ── MEDIA ROW COMPONENT ──
function MediaRow({ title, items, isTop10 = false }: { title: string; items: MediaItem[]; isTop10?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {isTop10 ? <TrendingUp size={20} style={{ color: 'var(--accent)' }} /> : <Sparkles size={18} style={{ color: 'var(--accent)' }} />}
          <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        <button className="text-sm font-bold flex items-center gap-1 transition-opacity hover:opacity-100 opacity-50" style={{ color: 'var(--text-secondary)' }}>
          View All <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-3 px-1 snap-x" style={{ scrollbarWidth: 'none' }}>
        {items.map((item, idx) => {
          const poster = getPoster(item);
          const id = getId(item);
          return (
            <Link
              href={`/${item.type}/${id}`}
              key={`${id}-${idx}`}
              className="snap-start shrink-0 relative group rounded-2xl overflow-visible cursor-pointer"
              style={{ width: isTop10 ? '200px' : '140px' }}
            >
              {/* Big rank number behind card */}
              {isTop10 && (
                <span
                  className="absolute -left-3 bottom-0 z-0 select-none font-black leading-none"
                  style={{
                    fontSize: '90px',
                    WebkitTextStroke: '2px rgba(255,255,255,0.7)',
                    color: 'transparent',
                    lineHeight: 1
                  }}
                >
                  {idx + 1}
                </span>
              )}

              {/* Poster */}
              <div className={`aspect-[2/3] relative overflow-hidden rounded-2xl ${isTop10 ? 'ml-6' : ''}`} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                {poster ? (
                  <img
                    src={poster}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/300x450/1e293b/64748b?text=${encodeURIComponent(item.title.slice(0, 12))}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-center p-2" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {item.title}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}>
                  <button className="w-full py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>
                    <Play size={12} className="inline mr-1" fill="white" /> Play
                  </button>
                </div>

                {/* Score badge */}
                {!isTop10 && item.vote_average && item.vote_average > 0 && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white border border-white/10" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
                    <Star size={10} fill="#facc15" style={{ color: '#facc15' }} />
                    {item.vote_average.toFixed(1)}
                  </div>
                )}
              </div>

              {/* Title below */}
              <p className="mt-2 text-xs font-semibold truncate px-1" style={{ color: 'var(--text-secondary)' }}>{item.title}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
