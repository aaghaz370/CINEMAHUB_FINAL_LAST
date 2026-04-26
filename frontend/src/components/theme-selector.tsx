'use client';

import { useAppTheme, ThemeId } from './theme-provider';
import { Check } from 'lucide-react';

const lightThemes = [
  { id: 'soft-frost' as ThemeId, name: 'Soft Frost', emoji: '❄️', desc: 'Airy glassmorphic blues', gradient: 'from-blue-100 to-indigo-200' },
  { id: 'champagne-gold' as ThemeId, name: 'Champagne Gold', emoji: '✨', desc: 'Luxury warm cream tones', gradient: 'from-amber-100 to-yellow-200' },
  { id: 'arctic-mint' as ThemeId, name: 'Arctic Mint', emoji: '🌿', desc: 'Fresh emerald clarity', gradient: 'from-emerald-100 to-teal-200' },
];

const darkThemes = [
  { id: 'midnight-indigo' as ThemeId, name: 'Midnight Indigo', emoji: '🌌', desc: 'Deep sky, cinema feel', gradient: 'from-indigo-950 to-slate-950' },
  { id: 'cyber-rose' as ThemeId, name: 'Cyber Rose', emoji: '🌸', desc: 'Neon pink, gaming vibe', gradient: 'from-pink-950 to-fuchsia-950' },
  { id: 'forest-stealth' as ThemeId, name: 'Forest Stealth', emoji: '🌲', desc: 'Dark emerald luxury', gradient: 'from-emerald-950 to-gray-950' },
];

export function ThemeSelector() {
  const { theme, mode, setTheme, setMode } = useAppTheme();

  return (
    <div className="space-y-8">
      {/* Mode Toggle */}
      <div className="flex p-1 rounded-2xl gap-1" style={{ background: 'var(--bg-secondary)' }}>
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 capitalize"
            style={mode === m ? {
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 4px 20px var(--accent-glow)',
            } : {
              color: 'var(--text-secondary)',
            }}
          >
            {m === 'light' ? '☀️ ' : '🌙 '}{m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Light Themes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
          ☀️ Day Mode Themes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lightThemes.map((t) => (
            <ThemeCard key={t.id} {...t} isActive={theme === t.id} onClick={() => { setTheme(t.id); setMode('light'); }} />
          ))}
        </div>
      </div>

      {/* Dark Themes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
          🌙 Night Mode Themes
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {darkThemes.map((t) => (
            <ThemeCard key={t.id} {...t} isActive={theme === t.id} onClick={() => { setTheme(t.id); setMode('dark'); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ id, name, emoji, desc, gradient, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${gradient}`}
      style={{ borderColor: isActive ? 'var(--accent)' : 'transparent' }}
    >
      <div className="text-2xl mb-3">{emoji}</div>
      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{name}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      {isActive && (
        <div
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
