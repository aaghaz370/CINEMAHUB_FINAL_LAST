'use client';

import { ThemeSelector } from '@/components/theme-selector';
import { useAppTheme } from '@/components/theme-provider';
import { ShieldCheck, Monitor, Globe } from 'lucide-react';
import { LanguageSelector } from '@/components/language-selector';
import { useLanguage } from '@/lib/i18n';

export default function SettingsPage() {
  const { mode } = useAppTheme();
  const { t } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 md:py-8">
      <section>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          {t('settings')}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {t('manage_experience')}{' '}
          <span className="font-bold" style={{ color: 'var(--accent)' }}>
            {mode === 'dark' ? `🌙 ${t('night_mode')}` : `☀️ ${t('day_mode')}`}
          </span>
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Monitor style={{ color: 'var(--accent)' }} size={22} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('appearance')}</h2>
          </div>
          <div className="p-6 rounded-3xl glass h-full" style={{ border: '1px solid var(--border)' }}>
            <ThemeSelector />
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <Globe style={{ color: 'var(--accent)' }} size={22} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('language_region')}</h2>
          </div>
          <div className="p-6 rounded-3xl glass h-full" style={{ border: '1px solid var(--border)' }}>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Choose your preferred language for the interface. This will instantly translate the entire application.
            </p>
            <LanguageSelector />
          </div>
        </section>
      </div>

      <footer
        className="pt-12 mt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs opacity-50"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} />
          CinemaHub v1.0.0
        </div>
        <div className="flex gap-6 font-semibold">
          <span className="cursor-pointer hover:opacity-100">DMCA</span>
          <span className="cursor-pointer hover:opacity-100">Terms</span>
          <span className="cursor-pointer hover:opacity-100">Contact</span>
        </div>
      </footer>
    </div>
  );
}
