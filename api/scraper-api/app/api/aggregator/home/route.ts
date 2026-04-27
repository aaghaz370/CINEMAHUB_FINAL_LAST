import { NextRequest, NextResponse } from 'next/server';
import { getHomeData } from '@/lib/aggregator';

export const maxDuration = 60;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;
    const sections = await getHomeData(baseUrl);

    return NextResponse.json(
      { success: true, data: { totalSections: sections.length, sections } },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[aggregator/home]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Home fetch failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
