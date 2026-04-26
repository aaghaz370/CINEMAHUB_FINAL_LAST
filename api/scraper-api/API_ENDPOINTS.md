# 🚀 ScarperApi Complete Endpoints Guide

Here is the complete list of all endpoints available in the Next.js scraping API. 
To test these, make sure your Next.js server is running (`npm run dev`) and use `http://localhost:3000` (or your deployed URL) as the base URL.
For endpoints needing specific input, pass them via query parameters (e.g., `?q=batman`, `?url=...`, `?id=...`).

## 🎬 Movies & Series Providers

### 1. MovieBox (`themovie`)
- `GET /api/themovie` - Fetch homepage content / latest uploads.
- `GET /api/themovie/search?q={query}` - Search for a movie/series.
- `GET /api/themovie/det?url={url}` - Get details, properties, and metadata for a specific item.
- `GET /api/themovie/stream?url={url}` - Get available streaming links.

### 2. KMMovies
- `GET /api/kmmovies` - Fetch homepage latest releases (Dual Audio/Hindi Dubbed).
- `GET /api/kmmovies/search?q={query}` - Search movies.
- `GET /api/kmmovies/details?url={url}` - Movie details (including multiple resolutions like 480p, 720p).
- `GET /api/kmmovies/magiclinks?url={url}` - Extract direct download/magic links.

### 3. NetMirror
- `GET /api/netmirror` - Homepage content.
- `GET /api/netmirror/search?q={query}` - Search for movies.
- `GET /api/netmirror/getpost?url={url}` / `?id={id}` - Specific Post details.
- `GET /api/netmirror/stream?url={url}` / `?id={id}` - Get M3U8 streaming URLs.

### 4. VegaMovies (`vega`)
- `GET /api/vega` - Homepage latest series and movies updates.
- `GET /api/vega/search?q={query}` - Search VegaMovies library.
- `GET /api/vega/details?url={url}` - Get post details for downloads.
- `GET /api/vega/nextdrive?url={url}` - Bypass and extract NextDrive/FastDrive links.

### 5. UHDMovies
- `GET /api/uhdmovies` - Homepage content.
- `GET /api/uhdmovies/search?q={query}` - Search UHD Movies.
- `GET /api/uhdmovies/details?url={url}` - Get UHD properties/details.
- `GET /api/uhdmovies/tech?url={url}` - Extract links (TechDrive, etc.).

### 6. HDHub4U
- `GET /api/hdhub4u` - Homepage content.
- `GET /api/hdhub4u/search?q={query}` - Search movies in HDHub.
- `GET /api/hdhub4u/details?url={url}` - Post details.
- `GET /api/hdhub4u/extractor?url={url}` - HDHub link extractor bypass.

### 7. Movies4U
- `GET /api/movies4u` - Homepage content.
- `GET /api/movies4u/search?q={query}` - Search.
- `GET /api/movies4u/details?url={url}` - Details.
- `GET /api/movies4u/m4ulinks?url={url}` - Extract M4U source links.

### 8. DesireMovies
- `GET /api/desiremovies` - Homepage content.
- `GET /api/desiremovies/search?q={query}` - Search.
- `GET /api/desiremovies/details?url={url}` - Post details.
- `GET /api/desiremovies/gyaniguru?url={url}` - Bypass GyaniGuru link shorteners.

### 9. ZeeFlix (`zeefliz`)
- `GET /api/zeefliz` - Homepage updates.
- `GET /api/zeefliz/search?q={query}` - Search.
- `GET /api/zeefliz/details?url={url}` - Get details.
- `GET /api/zeefliz/nextdrive?url={url}` - Extract NextDrive download links.

### 10. ZinkMovies
- `GET /api/zinkmovies` - Homepage updates.
- `GET /api/zinkmovies/search?q={query}` - Search.
- `GET /api/zinkmovies/details?url={url}` - Get details.
- `GET /api/zinkmovies/zinkcloud?url={url}` - Extract ZinkCloud links.

---

## ⛩️ Anime Providers

### 11. AnimeSalt
- `GET /api/animesalt` - Latest Anime updates.
- `GET /api/animesalt/search?q={query}` - Search Anime.
- `GET /api/animesalt/details?url={url}` - Anime episodes lists & info.
- `GET /api/animesalt/stream?url={url}` - Streaming file URLs.

### 12. AnimePahe
- `GET /api/animepahe` - Latest lists.
- `GET /api/animepahe/search?q={query}` - Search AnimePahe.
- `GET /api/animepahe/details?url={url}` - Anime page details.
- `GET /api/animepahe/stream?url={url}` - MP4/M3U8 Streaming links.

---

## 🔞 18+ / Adult Modules

### 13. Adult (ZTeen)
- `GET /api/adult/zteen`
- `GET /api/adult/zteen/search?q={query}`
- `GET /api/adult/zteen/stream?url={url}`

### 14. Hentai
- `GET /api/hentai`
- `GET /api/hentai/video?url={url}`

### 15. PH
- `GET /api/ph`

---

## 🛠 Advanced Extractors & Drive Tools

### 16. Cloud Drives
- `GET /api/drive`
- `GET /api/drive/search?q={query}`
- `GET /api/drive/details?url={url}`
- `GET /api/drive/mdrive?url={url}`

### 17. Link Extractors (Raw Stream Bypassers)
- `GET /api/extractors/gdflix?url={url}`
- `GET /api/extractors/hubcloud?url={url}`
- `GET /api/extractors/streamtape?url={url}`
- `GET /api/extractors/xprime?url={url}`
- `GET /api/vid?url={url}` (General video host extractor)

### 18. Modding / Software (APKs)
- `GET /api/mod`
- `GET /api/mod/search?q={query}`
- `GET /api/mod/details?url={url}`
- `GET /api/mod/modpro?url={url}`

### 19. Castle (`castel`)
- `GET /api/castel?url={url}` - Fetch/scrape castle content bypass.

---

### 🚦 Quick Test Guide

1. Ensure your Next.js server is running (`npm run dev`).
2. Open your browser and test a primary homepage route.
   **Example:** `http://localhost:3000/api/themovie`
3. Try a search command to see JSON arrays of results:
   **Example:** `http://localhost:3000/api/themovie/search?q=avengers`
4. Pick any `href` or `url` field from the search result JSON and pass it to the details or stream route:
   **Example:** `http://localhost:3000/api/themovie/det?url=SELECTED_URL`

**💡 Pro Tip for Testing:**  
If a specific provider link gives a 500 error or doesn't work, network blocks might be active. Double-check if that provider's domain (configured in GitHub JSON or `lib/baseurl.ts`) is accessible from your network.
