'use client';

import { useAppTheme, ThemeId } from './theme-provider';
import { useLanguage } from '@/lib/i18n';
import { Check, Snowflake, Sparkles, Leaf, MoonStar, Gamepad2, Trees } from 'lucide-react';

const lightThemes = [
  { id: 'soft-frost' as ThemeId, name: 'Soft Frost', Icon: Snowflake, desc: 'Airy glassmorphic blues', gradient: 'from-blue-100 to-indigo-200' },
  { id: 'champagne-gold' as ThemeId, name: 'Champagne Gold', Icon: Sparkles, desc: 'Luxury warm cream tones', gradient: 'from-amber-100 to-yellow-200' },
  { id: 'arctic-mint' as ThemeId, name: 'Arctic Mint', Icon: Leaf, desc: 'Fresh emerald clarity', gradient: 'from-emerald-100 to-teal-200' },
];

const darkThemes = [
  { id: 'midnight-indigo' as ThemeId, name: 'Midnight Indigo', Icon: MoonStar, desc: 'Deep sky, cinema feel', gradient: 'from-indigo-950 to-slate-950' },
  { id: 'cyber-rose' as ThemeId, name: 'Cyber Rose', Icon: Gamepad2, desc: 'Neon pink, gaming vibe', gradient: 'from-pink-950 to-fuchsia-950' },
  { id: 'forest-stealth' as ThemeId, name: 'Forest Stealth', Icon: Trees, desc: 'Dark emerald luxury', gradient: 'from-emerald-950 to-gray-950' },
];

export function ThemeSelector() {
  const { theme, mode, setTheme, setMode } = useAppTheme();
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Mode Toggle */}
      <div className="flex p-1 rounded-2xl gap-1" style={{ background: 'var(--bg-secondary)' }}>
        {(['light', 'dark'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-300 capitalize flex items-center justify-center gap-2"
            style={mode === m ? {
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 4px 20px var(--accent-glow)',
            } : {
              color: 'var(--text-secondary)',
            }}
          >
            {m === 'light' ? <Sparkles size={16} /> : <MoonStar size={16} />}
            {m === 'light' ? t('day_mode') : t('night_mode')}
          </button>
        ))}
      </div>

      {/* Light Themes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Sparkles size={14} /> {t('day_themes')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {lightThemes.map((tItem) => (
            <ThemeCard key={tItem.id} {...tItem} isActive={theme === tItem.id} onClick={() => { setTheme(tItem.id); setMode('light'); }} />
          ))}
        </div>
      </div>

      {/* Dark Themes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <MoonStar size={14} /> {t('night_themes')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {darkThemes.map((tItem) => (
            <ThemeCard key={tItem.id} {...tItem} isActive={theme === tItem.id} onClick={() => { setTheme(tItem.id); setMode('dark'); }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ id, name, Icon, desc, gradient, isActive, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${gradient}`}
      style={{ borderColor: isActive ? 'var(--accent)' : 'transparent' }}
    >
      <div className="mb-3 p-2 rounded-xl" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Icon size={20} />
      </div>
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
