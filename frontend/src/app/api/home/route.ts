import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const TMDB_KEY = process.env.TMDB_API_KEY;

async function fetchTmdbTrending() {
  if (!TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const items = (data.results || []).slice(0, 20).map((m: any) => ({
      tmdb_id: m.id,
      title: m.title || m.name,
      type: m.media_type,
      overview: m.overview,
      vote_average: m.vote_average,
      release_date: m.release_date || m.first_air_date,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
    }));
    return items;
  } catch {
    return null;
  }
}

async function fetchTmdbCategory(path: string, label: string) {
  if (!TMDB_KEY) return null;
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3${path}?api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    const items = (data.results || []).slice(0, 15).map((m: any) => ({
      tmdb_id: m.id,
      title: m.title || m.name,
      type: m.title ? 'movie' : 'tv',
      overview: m.overview,
      vote_average: m.vote_average,
      release_date: m.release_date || m.first_air_date,
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
    }));
    return { title: label, items };
  } catch {
    return null;
  }
}

export async function GET() {
  // 1. Try to get data from our backend aggregator
  try {
    const res = await fetch(`${API_BASE}/api/aggregator/home`, {
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const data = await res.json();
      // Check if aggregator returned actual content
      const hasContent = data?.data?.sections?.some(
        (s: any) => s.items && s.items.length > 0
      );
      if (hasContent) {
        return NextResponse.json(data);
      }
    }
  } catch {
    // Aggregator unavailable — fall through to TMDB
  }

  // 2. Fallback: Build sections directly from TMDB API
  const [trending, popular_movies, top_rated_movies, popular_tv, top_rated_tv, upcoming] =
    await Promise.all([
      fetchTmdbTrending(),
      fetchTmdbCategory('/movie/popular', 'Popular Movies'),
      fetchTmdbCategory('/movie/top_rated', 'Top Rated Movies'),
      fetchTmdbCategory('/tv/popular', 'Popular Series'),
      fetchTmdbCategory('/tv/top_rated', 'Top Rated Series'),
      fetchTmdbCategory('/movie/upcoming', 'Coming Soon'),
    ]);

  const sections = [
    popular_movies,
    top_rated_movies,
    popular_tv,
    top_rated_tv,
    upcoming,
  ].filter(Boolean);

  return NextResponse.json({
    success: true,
    source: 'tmdb_fallback',
    data: {
      totalSections: sections.length,
      sections,
      trending: trending || [],
    },
  });
}
