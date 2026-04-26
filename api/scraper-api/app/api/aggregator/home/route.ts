import { NextRequest, NextResponse } from 'next/server';
import { getHomeData } from '@/lib/aggregator';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const baseUrl = new URL(request.url).origin;
    const sections = await getHomeData(baseUrl);

    return NextResponse.json({
      success: true,
      data: {
        totalSections: sections.length,
        sections,
      }
    });
  } catch (error) {
    console.error('[aggregator/home]', error);
    return NextResponse.json({
      success: false,
      error: 'Home fetch failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
