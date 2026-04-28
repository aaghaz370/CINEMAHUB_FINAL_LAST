import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const uris = [
    process.env.MONGODB_URI,
    process.env.MONGODB_URI2,
    process.env.MONGODB_URI3,
  ].filter(Boolean) as string[];

  try {
    const searchPromises = uris.map(async (uri) => {
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db('cinemahub');
      const results = await db.collection('media')
        .find({ $text: { $search: query } })
        .limit(10)
        .toArray();
      await client.close();
      return results;
    });

    const allResults = await Promise.all(searchPromises);
    const combined = allResults.flat();

    // Sort by TMDB popularity or vote_average in memory since we merged results
    combined.sort((a, b) => b.vote_average - a.vote_average);

    return NextResponse.json(combined.slice(0, 20));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
