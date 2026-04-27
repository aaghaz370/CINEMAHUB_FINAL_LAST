'use client';

import React, { useState } from 'react';
import { Home, Search, Film, Tv, PlayCircle, Settings, Menu, X, MonitorPlay } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';

const navigation = [
  { key: 'home', href: '/', icon: Home },
  { key: 'search', href: '/search', icon: Search },
  { key: 'movies', href: '/movies', icon: Film },
  { key: 'tv_shows', href: '/tv', icon: Tv },
  { key: 'anime', href: '/anime', icon: PlayCircle },
  { key: 'settings', href: '/settings', icon: Settings },
];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* ── SIDEBAR (Desktop) ── */}
      <aside
        className="hidden md:flex flex-col m-4 mr-0 rounded-3xl glass transition-all duration-500 shrink-0"
        style={{ width: isSidebarOpen ? '240px' : '72px' }}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', boxShadow: '0 4px 14px var(--accent-glow)' }}>
            <MonitorPlay size={18} color="white" />
          </div>
          {isSidebarOpen && (
            <span className="font-black text-xl tracking-tighter text-glow" style={{ color: 'var(--text-primary)' }}>
              CinemaHub
            </span>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group"
                style={isActive ? {
                  background: 'var(--accent)',
                  color: '#fff',
                  boxShadow: '0 4px 20px var(--accent-glow)',
                } : {
                  color: 'var(--text-secondary)',
                }}
              >
                <item.icon size={20} className="shrink-0 group-hover:scale-110 transition-transform" />
                {isSidebarOpen && (
                  <span className="font-semibold text-sm tracking-wide">{t(item.key)}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2.5 rounded-xl transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* Header */}
        <header
          className="sticky top-0 z-40 px-6 py-4 flex items-center gap-4"
          style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
        >
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-2.5 mr-auto">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <MonitorPlay size={16} color="white" />
            </div>
            <span className="font-black text-xl tracking-tighter">CinemaHub</span>
          </div>

          {/* Search (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-lg relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className="w-full rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div className="ml-auto hidden md:flex items-center gap-2">
            <Link href="/settings">
              <div className="w-9 h-9 rounded-xl glass flex items-center justify-center cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <Settings size={18} />
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 pb-32 md:pb-12">
          {children}
        </div>
      </main>

      {/* ── BOTTOM NAV (Mobile) ── */}
      <div className="md:hidden fixed bottom-5 left-4 right-4 z-50">
        <nav
          className="glass flex items-center justify-around px-4 py-3"
          style={{ borderRadius: '2rem', boxShadow: '0 8px 40px var(--accent-glow)' }}
        >
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center gap-1 transition-all duration-300"
                style={isActive ? { color: 'var(--accent)' } : { color: 'var(--text-secondary)' }}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-bold">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
