import * as cheerio from 'cheerio';

// ─── Site map: key → category label ──────────────────────────────────────────
export const DOMAIN_KEYS = {
    moviesmod:   'hollywood',
    moviesflyx:  'bollywood',
    animeflix:   'animeflix',
    uhdmovies:   'uhdmovies',
} as const;

export type SiteKey = keyof typeof DOMAIN_KEYS;

// ─── Fallback domains (verified 2025-04) ─────────────────────────────────────
// IMPORTANT: moviesmod.farm is hardcoded — do NOT let modlist.in override it
const DEFAULT_DOMAINS: Record<SiteKey, string> = {
    moviesmod:  'https://moviesmod.farm',   // ✅ Verified working
    moviesflyx: 'https://moviesdrive.world', // Bollywood alternative
    animeflix:  'https://animeflix.dad',
    uhdmovies:  'https://uhdmovies.ink',
};

// ─── Simple cache (no TTL, no modlist.in refresh — just use defaults) ─────────
const cachedDomains: Partial<Record<SiteKey, string>> = {};

// Alias map: accept legacy keys, map to canonical ones
const ALIASES: Record<string, SiteKey> = {
    moviesleech:  'moviesflyx',
    bollywood:    'moviesflyx',
    hollywood:    'moviesmod',
    anime:        'animeflix',
    '4k':         'uhdmovies',
};

export function resolveKey(raw: string): SiteKey {
    const lower = raw.toLowerCase();
    if (lower in DEFAULT_DOMAINS) return lower as SiteKey;
    if (lower in ALIASES) return ALIASES[lower];
    throw new Error(`Unknown site key: "${raw}". Use: ${Object.keys(DEFAULT_DOMAINS).join(', ')}`);
}

export async function getLiveDomain(key: SiteKey): Promise<string> {
    if (cachedDomains[key]) return cachedDomains[key]!;
    cachedDomains[key] = DEFAULT_DOMAINS[key];
    return DEFAULT_DOMAINS[key];
}

void cheerio; // keep import used (used in core.ts which imports this)
