import { NextRequest, NextResponse } from 'next/server';
import { searchAllProviders } from '@/lib/aggregator';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const page  = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query param "q" is required' }, { status: 400 });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const results = await searchAllProviders(query, baseUrl);

    // Paginate
    const perPage = 20;
    const start   = (page - 1) * perPage;
    const paged   = results.slice(start, start + perPage);

    return NextResponse.json({
      success: true,
      data: {
        query,
        page,
        totalResults: results.length,
        totalPages: Math.ceil(results.length / perPage),
        results: paged,
      }
    });
  } catch (error) {
    console.error('[aggregator/search]', error);
    return NextResponse.json({
      success: false,
      error: 'Search failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
