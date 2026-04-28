import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'movie';
  const id = parseInt(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const db = await getDb(id);
    const media = await db.collection('media').findOne({ tmdb_id: id, type });

    if (!media) {
      return NextResponse.json({ error: "Not found in database" }, { status: 404 });
    }

    return NextResponse.json(media);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
