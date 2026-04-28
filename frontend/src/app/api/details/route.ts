import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';

// Parse TheMovieBox dubs from NUXT data
const TMB_COOKIE = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';
const TMB_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36';

async function getTMBLanguages(postUrl: string): Promise<string[]> {
  try {
    const res = await fetch(postUrl, {
      headers: { 'User-Agent': TMB_UA, 'Accept': 'text/html', 'Cookie': TMB_COOKIE, 'X-Source': 'h5', 'X-Client-Info': '{"timezone":"Asia/Calcutta"}' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return ['Multi'];
    const html = await res.text();
    const m = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return ['Multi'];
    const raw: unknown[] = JSON.parse(m[1]);

    const langs = new Set<string>(['Original']);
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (typeof item !== 'object' || !item || Array.isArray(item)) continue;
      const obj = item as Record<string, unknown>;
      if (!('dubs' in obj)) continue;
      const dubsPtr = obj.dubs;
      if (typeof dubsPtr !== 'number') continue;
      const dubsArr = raw[dubsPtr as number];
      if (!Array.isArray(dubsArr)) continue;
      for (const dubPtr of dubsArr) {
        if (typeof dubPtr !== 'number') continue;
        const dub = raw[dubPtr];
        if (typeof dub !== 'object' || !dub) continue;
        const d = dub as Record<string, unknown>;
        const namePtr = d.lanName ?? d.name;
        const name = typeof namePtr === 'number' ? raw[namePtr] : namePtr;
        if (typeof name === 'string' && name.trim()) langs.add(name.trim());
      }
      break;
    }
    return Array.from(langs);
  } catch { return ['Multi']; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // 1. TMDB metadata (fast, cached)
  let tmdbData: any = null;
  if (TMDB_KEY) {
    try {
      const r = await fetch(`${TMDB}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos`, { next: { revalidate: 86400 } });
      if (r.ok) tmdbData = await r.json();
    } catch {}
  }

  const title = tmdbData?.title || tmdbData?.name || '';
  const year = (tmdbData?.release_date || tmdbData?.first_air_date || '').substring(0, 4);
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  // 2. Search all providers in parallel
  const PROVIDERS: Record<string, string> = {
    themovie: `/api/themovie?action=search&q=`,
    netmirror: `/api/netmirror?action=search&q=`,
    hdhub4u: `/api/hdhub4u/search?q=`,
    mod: `/api/mod?action=search&q=`,
    vega: `/api/vega?action=search&q=`,
    '4khdhub': `/api/4khdhub?action=search&q=`,
    kmmovies: `/api/kmmovies?action=search&q=`,
    modlist_moviesmod: `/api/modlist/moviesmod?q=`,
  };

  const fetchProvider = async (provider: string, path: string) => {
    try {
      const res = await fetch(`${API_BASE}${path}${encodeURIComponent(title)}`, {
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const results: any[] =
        json?.movies || json?.data?.results || json?.data?.searchResults?.searchResult ||
        json?.data?.items || json?.data || json?.results || [];

      const match = results.find((item: any) => {
        const t = (item.title || item.t || item.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const short = cleanTitle.substring(0, Math.min(cleanTitle.length, 8));
        return short.length > 2 && (t.includes(short) || short.includes(t.substring(0, short.length)));
      });
      if (!match) return null;

      const postUrl = match.watchUrl || match.url || match.permalink || match.postUrl || match.watchUrl || '';
      if (!postUrl) return null;

      return {
        provider,
        id: String(match.subjectId || match.id || match.v_id || ''),
        title: match.title || match.t || match.name || '',
        postUrl,
        year: match.releaseDate?.substring(0, 4) || match.year || year,
      };
    } catch { return null; }
  };

  const sourceResults = await Promise.all(
    Object.entries(PROVIDERS).map(([p, path]) => fetchProvider(p, path))
  );
  const sources = sourceResults.filter(Boolean) as any[];

  // 3. Fetch TheMovieBox dub languages (if we found a TMB source)
  const tmbSource = sources.find(s => s.provider === 'themovie');
  let availableLanguages: string[] = ['Multi'];
  if (tmbSource?.postUrl) {
    availableLanguages = await getTMBLanguages(tmbSource.postUrl);
  } else if (sources.length > 0) {
    availableLanguages = ['Hindi', 'Multi', 'English'];
  }

  return NextResponse.json({
    success: true,
    data: {
      tmdbId: id, type,
      title, originalTitle: tmdbData?.original_title || tmdbData?.original_name || '',
      year, overview: tmdbData?.overview || '',
      poster: tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
      backdrop: tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
      vote_average: tmdbData?.vote_average || 0, vote_count: tmdbData?.vote_count || 0,
      genres: tmdbData?.genres?.map((g: any) => g.name) || [],
      runtime: tmdbData?.runtime || null, status: tmdbData?.status || '',
      cast: tmdbData?.credits?.cast?.slice(0, 12).map((c: any) => ({
        name: c.name, character: c.character,
        profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      })) || [],
      trailer: tmdbData?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      )?.key || null,
      seasons: type === 'tv' ? tmdbData?.seasons?.filter((s: any) => s.season_number > 0) : null,
      sources,
      totalSources: sources.length,
      availableLanguages,  // real languages from TMB dubs page
    },
  });
}
