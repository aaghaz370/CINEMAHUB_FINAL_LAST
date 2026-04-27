'use client';

import { ThemeSelector } from '@/components/theme-selector';
import { useAppTheme } from '@/components/theme-provider';
import { ShieldCheck, Monitor, Globe } from 'lucide-react';
import { LanguageSelector } from '@/components/language-selector';

export default function SettingsPage() {
  const { mode } = useAppTheme();

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-6">
      <section>
        <h1 className="text-3xl font-black tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your experience. Currently in{' '}
          <span className="font-bold" style={{ color: 'var(--accent)' }}>
            {mode === 'dark' ? '🌙 Night' : '☀️ Day'} Mode
          </span>
        </p>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <Monitor style={{ color: 'var(--accent)' }} size={22} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
        </div>
        <div className="p-6 rounded-3xl glass" style={{ border: '1px solid var(--border)' }}>
          <ThemeSelector />
        </div>
      </section>

      <section className="space-y-5 pt-4">
        <div className="flex items-center gap-3">
          <Globe style={{ color: 'var(--accent)' }} size={22} />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Language & Region</h2>
        </div>
        <div className="p-6 rounded-3xl glass" style={{ border: '1px solid var(--border)' }}>
          <LanguageSelector />
        </div>
      </section>

      <footer
        className="pt-12 flex flex-col md:flex-row items-center justify-between gap-6 text-xs opacity-50"
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
