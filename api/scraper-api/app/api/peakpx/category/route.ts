import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPX, parseWallpaperGrid, parsePagination } from "../_utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export const PEAKPX_CATEGORIES = [
  "abstract", "amoled", "anime", "cars", "city", "fantasy", 
  "gaming", "minimalism", "movies", "music", "nature", "neon", "space", "sports"
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("name") || searchParams.get("category") || "").toLowerCase().trim();
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!category) {
      return NextResponse.json({ error: "Missing category name.", availableCategories: PEAKPX_CATEGORIES }, { status: 400 });
    }

    const url = page > 1
      ? `https://www.peakpx.com/en/category/${encodeURIComponent(category)}/page/${page}`
      : `https://www.peakpx.com/en/category/${encodeURIComponent(category)}`;

    const html = await fetchPeakPX(url);
    const wallpapers = parseWallpaperGrid(html);
    const { totalPages, hasNextPage } = parsePagination(html, page);

    return NextResponse.json({
      success: true,
      category,
      page,
      totalPages,
      hasNextPage,
      count: wallpapers.length,
      wallpapers
    });
  } catch (error: any) {
    console.error("[peakpx/category] ERROR:", error.message);
    return NextResponse.json({ error: "Category fetch failed", message: error.message }, { status: 500 });
  }
}
