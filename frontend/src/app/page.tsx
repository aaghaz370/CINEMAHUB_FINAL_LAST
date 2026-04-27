'use client';

import React, { useEffect, useState } from 'react';
import { Play, Plus, Info, Star, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

// Interfaces based on API response
interface TrendingItem {
  tmdb_id: number;
  title: string;
  type: string;
  poster: string | null;
  backdrop: string | null;
  release_date: string;
  vote_average: number;
  overview: string;
}

export default function Home() {
  const [heroItems, setHeroItems] = useState<TrendingItem[]>([]);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('https://cinemahub-api.vercel.app/api/aggregator/home');
        let data = await res.json();
        
        // If the API isn't returning data yet, fallback to our trending proxy or mock
        if (!data || !data.trending || data.trending.length === 0) {
           const fallbackRes = await fetch('/api/trending?type=all');
           const fallbackData = await fallbackRes.json();
           data = {
             trending: fallbackData.results || [],
             latest: fallbackData.results?.slice().reverse() || []
           };
        }

        const items = data.trending || [];
        if (items.length > 0) {
          setTrending(items);
          // Pick top 5 with backdrops for Hero Carousel
          const withBackdrops = items.filter((m: TrendingItem) => m.backdrop);
          setHeroItems(withBackdrops.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-slide hero carousel
  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      setActiveHeroIdx((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeHero = heroItems[activeHeroIdx];

  return (
    <div className="space-y-12">
      {/* ── HERO CAROUSEL ── */}
      {activeHero && (
        <section className="relative h-[65vh] min-h-[450px] max-h-[700px] rounded-[32px] overflow-hidden group">
          
          {/* Background Images with Crossfade */}
          {heroItems.map((item, idx) => (
            <div 
              key={item.tmdb_id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === activeHeroIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              style={{ backgroundImage: `url(${item.backdrop})` }}
            />
          ))}

          {/* Gradients to blend with background and text */}
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[var(--bg-primary)] via-black/20 to-transparent opacity-80" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-60" />

          {/* Pagination Dots (Right Side) */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
            {heroItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveHeroIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === activeHeroIdx ? 'bg-white h-8' : 'bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>

          {/* Floating Glass Card Details (Bottom Center) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-2xl">
            <div className="flex items-stretch bg-black/60 backdrop-blur-xl rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
              
              {/* Left Vertical Label */}
              <div className="flex items-center justify-center px-3 border-r border-white/10 bg-white/5">
                <span className="text-[10px] font-black tracking-[0.3em] text-white/50 uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  {activeHero.type === 'movie' ? 'MOVIE' : 'SERIES'}
                </span>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-5 md:p-6 flex flex-col items-center justify-center text-center">
                {/* Fallback to styled text if no logo, you can integrate real logos later */}
                <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg tracking-tighter mb-4 line-clamp-2">
                  {activeHero.title}
                </h1>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white bg-[#e50914] hover:bg-[#b81d24] transition-all hover:scale-105 shadow-[0_0_20px_rgba(229,9,20,0.4)] text-sm">
                    <Play size={16} fill="white" />
                    {t('watch_now')}
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-black bg-[#fbbf24] hover:bg-[#f59e0b] transition-all hover:scale-105 text-sm">
                    Details
                  </button>
                  <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white border border-white/10">
                    <Plus size={18} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── ROW: TRENDING NOW ── */}
      <MediaRow title={t('trending_now')} items={trending} icon={<TrendingUp size={20} className="text-accent" />} />

      {/* ── ROW: LATEST RELEASES ── */}
      {/* We shuffle or slice differently just for demo UI until real API endpoints are attached */}
      <MediaRow title="Latest Releases" items={[...trending].reverse()} icon={<Sparkles size={20} className="text-accent" />} />

      {/* ── ROW: TOP 10 MOVIES OF THE WEEK ── */}
      <MediaRow title="Top 10 Movies" items={trending.filter(t => t.type === 'movie').slice(0, 10)} isTop10={true} />

      {/* ── ROW: TOP 10 SERIES OF THE WEEK ── */}
      <MediaRow title="Top 10 Series" items={trending.filter(t => t.type === 'tv').slice(0, 10)} isTop10={true} />

      {/* ── ROW: ROMANCE (MOCK) ── */}
      <MediaRow title="Romance" items={[...trending].sort(() => Math.random() - 0.5)} />

    </div>
  );
}

// Helper component for Media Rows
function MediaRow({ title, items, icon, isTop10 = false }: { title: string, items: TrendingItem[], icon?: React.ReactNode, isTop10?: boolean }) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
        </div>
        <button className="text-sm font-bold flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
          View All <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none' }}>
        {items.map((item, idx) => (
          <div
            key={`${item.tmdb_id}-${idx}`}
            className="snap-start shrink-0 relative group rounded-2xl overflow-hidden cursor-pointer"
            style={{ width: isTop10 ? '220px' : '150px' }}
          >
            {/* Top 10 Big Number */}
            {isTop10 && (
              <div className="absolute -left-2 bottom-0 z-20 font-black text-[100px] leading-none opacity-80" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.8)', color: 'transparent', textShadow: '2px 2px 10px rgba(0,0,0,0.5)' }}>
                {idx + 1}
              </div>
            )}

            <div className={`aspect-[2/3] relative overflow-hidden rounded-2xl ${isTop10 ? 'ml-8' : ''}`}>
              <img
                src={item.poster || ''}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://via.placeholder.com/300x450/1e293b/64748b?text=${encodeURIComponent(item.title)}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <button
                  className="w-full py-2 rounded-xl text-xs font-bold text-white relative overflow-hidden"
                  style={{ background: 'var(--accent)' }}
                >
                  <Play size={12} className="inline mr-1" fill="white" />
                  Play
                </button>
              </div>
              
              {/* Score Badge */}
              {!isTop10 && item.vote_average > 0 && (
                 <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                   <Star size={10} className="text-yellow-400" fill="currentColor" />
                   {item.vote_average.toFixed(1)}
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
