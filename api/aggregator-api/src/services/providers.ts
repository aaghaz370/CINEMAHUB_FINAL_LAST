/**
 * PROVIDER REGISTRY
 * 
 * Har provider ka ek adapter hota hai jo:
 * 1. search(query) → ProviderResult[] return karta hai
 * 2. Normalized format mein data deta hai
 * 3. Title + Year se TMDB matching hoti hai
 */

export interface ProviderResult {
  title: string;
  url: string;               // Provider-specific page URL
  image?: string;
  year?: string;
  type: 'movie' | 'tv' | 'anime';
  provider: string;
  providerId: string;        // Unique provider key
}

// ─── Animesalt Adapter ─────────────────────────────────────────────────────
async function searchAnimeSalt(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/animesalt/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      image: r.image,
      year: r.year,
      type: r.type === 'movie' ? 'movie' : 'tv',
      provider: 'AnimeSalt',
      providerId: 'animesalt',
    }));
  } catch { return []; }
}

// ─── MovieBox (TheMovie) Adapter ───────────────────────────────────────────
async function searchMovieBox(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/themovie/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || data.movies || [];
    return results.map((r: any) => ({
      title: r.title || r.name || r.t,
      url: r.fullUrl || r.href || r.url,
      image: r.imageUrl || r.image || r.poster,
      year: r.year,
      type: (r.type === 'series' || r.type === 'show') ? 'tv' : 'movie',
      provider: 'MovieBox',
      providerId: 'themovie',
    }));
  } catch { return []; }
}

// ─── AnimePahe Adapter ─────────────────────────────────────────────────────
async function searchAnimePahe(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/animepahe/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      image: r.image,
      year: r.year,
      type: 'anime' as const,
      provider: 'AnimePahe',
      providerId: 'animepahe',
    }));
  } catch { return []; }
}

// ─── NetMirror Adapter ─────────────────────────────────────────────────────
async function searchNetMirror(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/netmirror/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    let items: any[] = [];
    if (data.data && data.data.searchResults && Array.isArray(data.data.searchResults.searchResult)) {
        items = data.data.searchResults.searchResult;
    } else if (data.results) {
        items = data.results;
    }
    return items.map((r: any) => ({
      title: r.title || r.name || r.t,
      url: r.url || `https://net22.cc/play.php?id=${r.id}`, // Netmirror IDs need to be formatted to URL if not present
      image: r.image || r.poster,
      year: r.year,
      type: (r.type === 'series' || r.type === 'show') ? 'tv' : 'movie',
      provider: 'NetMirror',
      providerId: 'netmirror',
    }));
  } catch { return []; }
}

// ─── UHDMovies Adapter ─────────────────────────────────────────────────────
async function searchUHDMovies(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/uhdmovies/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      image: r.image,
      year: r.year,
      type: 'movie' as const,
      provider: 'UHDMovies',
      providerId: 'uhdmovies',
    }));
  } catch { return []; }
}

// ─── KMMovies Adapter ──────────────────────────────────────────────────────
async function searchKMMovies(query: string, scraperBase: string): Promise<ProviderResult[]> {
  try {
    const res = await fetch(
      `${scraperBase}/api/kmmovies/search?q=${encodeURIComponent(query)}`,
      { headers: { 'x-internal-call': 'aggregator' }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      image: r.image,
      year: r.year,
      type: 'movie' as const,
      provider: 'KMMovies',
      providerId: 'kmmovies',
    }));
  } catch { return []; }
}

// ─── Master Search: All Providers in Parallel ─────────────────────────────
export async function searchAllProviders(
  query: string,
  scraperBase: string,
  enabledProviders?: string[]
): Promise<ProviderResult[]> {
  const all = [
    searchAnimeSalt(query, scraperBase),
    searchMovieBox(query, scraperBase),
    searchAnimePahe(query, scraperBase),
    searchNetMirror(query, scraperBase),
    searchUHDMovies(query, scraperBase),
    searchKMMovies(query, scraperBase),
  ];

  const results = await Promise.allSettled(all);
  const flat: ProviderResult[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') {
      flat.push(...r.value);
    }
  }

  return flat;
}
