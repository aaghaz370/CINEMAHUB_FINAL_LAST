import { NextResponse } from 'next/server';
import { fetchAllStreamsForTmdb } from '@/services/stream-aggregator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tmdb_id: string; type: string }> }
) {
  const { tmdb_id } = await params;
  const id = parseInt(tmdb_id);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 });
  }

  try {
    const groupedStreams = await fetchAllStreamsForTmdb(id);

    return NextResponse.json({
      success: true,
      tmdb_id: id,
      available_languages: groupedStreams.map(g => g.language),
      streams: groupedStreams,
      total_unique_links: groupedStreams.reduce((total, group) => {
         return total + group.qualities.reduce((qt, q) => qt + 1 + q.backups.length, 0);
      }, 0)
    });
  } catch (error: any) {
    console.error('Stream aggregation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
