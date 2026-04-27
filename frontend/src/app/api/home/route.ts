import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/aggregator/home`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
      headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend fetch failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch home data' }, { status: 500 });
  }
}
