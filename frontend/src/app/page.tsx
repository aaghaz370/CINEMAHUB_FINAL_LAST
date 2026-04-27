'use client';

import React from 'react';
import { Play, TrendingUp, Sparkles, Star } from 'lucide-react';

import { useEffect, useState } from 'react';

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
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [heroMovie, setHeroMovie] = useState<TrendingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/trending?type=all');
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setTrending(data.results);
          // Pick the first one with a backdrop for the hero section
          const hero = data.results.find((m: TrendingItem) => m.backdrop) || data.results[0];
          setHeroMovie(hero);
        }
      } catch (err) {
        console.error('Failed to load trending data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-14">

      {/* ── HERO ── */}
      {heroMovie && (
        <section
          className="relative h-[420px] md:h-[520px] rounded-3xl overflow-hidden group"
          style={{ boxShadow: '0 24px 80px var(--accent-glow)' }}
        >
          {/* Real TMDB Backdrop */}
          {heroMovie.backdrop ? (
             <div 
               className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 opacity-60 dark:opacity-40"
               style={{ backgroundImage: `url(${heroMovie.backdrop})` }}
             />
          ) : (
             <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--blob1), var(--bg-secondary), var(--blob2))' }} />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 p-8 md:p-12 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--accent)' }}>
              <Sparkles size={13} />
              #1 Trending
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-white drop-shadow-md">
              {heroMovie.title}
            </h1>
            
            <div className="flex items-center gap-4 text-white/80 text-sm font-semibold">
              <span className="flex items-center gap-1 text-yellow-500 bg-black/40 px-2 py-1 rounded-md backdrop-blur-md">
                <Star size={14} fill="currentColor" /> {heroMovie.vote_average?.toFixed(1) || '?'}
              </span>
              <span className="bg-black/40 px-2 py-1 rounded-md backdrop-blur-md">{heroMovie.release_date?.substring(0, 4) || 'N/A'}</span>
            </div>

            <p className="text-white/70 text-sm md:text-base line-clamp-3 drop-shadow-sm">
              {heroMovie.overview || "Click watch now to start streaming."}
            </p>

            <div className="flex gap-3 pt-2">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105"
              style={{ background: 'var(--accent)', boxShadow: '0 4px 20px var(--accent-glow)' }}
            >
              <Play size={16} fill="white" />
              Watch Now
            </button>
            <button
              className="px-6 py-3 rounded-2xl font-bold transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            >
              + My List
            </button>
          </div>
        </div>
      </section>
      )}

      {/* ── TRENDING ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <TrendingUp size={21} style={{ color: 'var(--accent)' }} />
          <h2 className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>
            Trending Now
          </h2>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {trending.map((item) => (
            <div
              key={item.tmdb_id}
              className="glass-card rounded-2xl overflow-hidden cursor-pointer group"
            >
              <div className="aspect-[2/3] relative overflow-hidden">
                <img
                  src={item.poster || ''}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://via.placeholder.com/200x300/1e293b/64748b?text=${encodeURIComponent(item.title)}`;
                  }}
                />
                {/* Type Badge */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white tracking-wider uppercase border border-white/10">
                  {item.type}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                  <button
                    className="w-full py-1.5 rounded-xl text-xs font-bold text-white relative overflow-hidden"
                    style={{ background: 'var(--accent)' }}
                  >
                    <div className="absolute inset-0 bg-white/20 hover:bg-transparent transition-colors" />
                    <Play size={12} className="inline mr-1" fill="white" />
                    Play
                  </button>
                </div>
              </div>
              <div className="p-2.5">
                <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={10} fill="var(--accent)" style={{ color: 'var(--accent)' }} />
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {item.vote_average ? item.vote_average.toFixed(1) : 'NR'} 
                    <span className="ml-1 opacity-50">• {item.release_date?.substring(0, 4) || ''}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRENDING ── */}

    </div>
  );
}
