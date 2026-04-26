import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPX, parseWallpaperGrid, parsePagination } from "../_utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    const url = page > 1
      ? `https://www.peakpx.com/en/?page=${page}`
      : `https://www.peakpx.com/en/`;

    const html = await fetchPeakPX(url);
    const wallpapers = parseWallpaperGrid(html);
    const { totalPages, hasNextPage } = parsePagination(html, page);

    return NextResponse.json({
      success: true,
      page,
      totalPages,
      hasNextPage,
      count: wallpapers.length,
      wallpapers
    });
  } catch (error: any) {
    console.error("[peakpx/trending] ERROR:", error.message);
    return NextResponse.json({ error: "Trending fetch failed", message: error.message }, { status: 500 });
  }
}
