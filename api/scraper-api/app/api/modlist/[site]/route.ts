import { NextRequest, NextResponse } from 'next/server';
import { fetchMoviesPage, fetchMovieDetails } from '../core';
import { resolveKey } from '../config';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ site: string }> }
) {
  try {
    const { site } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const q = searchParams.get('q') || searchParams.get('query') || '';
    const url = searchParams.get('url') || '';
    const action = searchParams.get('action') || '';

    // Validate + resolve site key (handles 'moviesleech' → 'moviesflyx' alias)
    let resolvedKey: string;
    try {
      resolvedKey = resolveKey(site);
    } catch {
      return NextResponse.json({
        success: false,
        error: `Invalid site "${site}". Use: moviesmod, moviesflyx, animeflix, uhdmovies (or alias: moviesleech→moviesflyx)`,
      }, { status: 400 });
    }

    // Details
    if (action === 'details' || url) {
      if (!url) return NextResponse.json({ success: false, error: 'url param required' }, { status: 400 });
      return NextResponse.json(await fetchMovieDetails(url));
    }

    // Search or home
    return NextResponse.json(await fetchMoviesPage(resolvedKey, page, q));

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[modlist]', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
