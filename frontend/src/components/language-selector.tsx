'use client';

import { useState, useEffect } from 'react';
import { Globe, Check, Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const languages = [
  { code: 'en', name: 'English', native: 'English', region: 'US / UK' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'India' },
  { code: 'es', name: 'Spanish', native: 'Español', region: 'Spain / Latin America' },
  { code: 'fr', name: 'French', native: 'Français', region: 'France' },
  { code: 'de', name: 'German', native: 'Deutsch', region: 'Germany' },
  { code: 'ja', name: 'Japanese', native: '日本語', region: 'Japan' },
  { code: 'ko', name: 'Korean', native: '한국어', region: 'South Korea' },
  { code: 'ar', name: 'Arabic', native: 'العربية', region: 'Middle East' },
  { code: 'zh', name: 'Chinese', native: '中文', region: 'China' },
  { code: 'ru', name: 'Russian', native: 'Русский', region: 'Russia' },
  { code: 'pt', name: 'Portuguese', native: 'Português', region: 'Brazil / Portugal' },
  { code: 'it', name: 'Italian', native: 'Italiano', region: 'Italy' }
];

export function LanguageSelector() {
  const { lang, setLang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeLang = languages.find(l => l.code === lang) || languages[0];

  const handleSelect = (code: string) => {
    setLang(code);
    setIsOpen(false);
  };

  return (
    <div>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full sm:w-auto flex items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent)', color: 'white' }}>
            <Globe size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{activeLang.native}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{activeLang.name} • {activeLang.region}</p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
          {t('select_language')}
        </div>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 shadow-2xl relative"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
                <Languages size={22} />
                <h2 className="text-lg md:text-xl font-bold tracking-tight text-glow" style={{ color: 'var(--text-primary)' }}>
                  {t('select_language')}
                </h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>
            
            {/* Languages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {languages.map((l) => {
                const isActive = lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => handleSelect(l.code)}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98]`}
                    style={{ 
                      background: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                      borderColor: isActive ? 'var(--accent)' : 'transparent',
                      boxShadow: isActive ? '0 8px 30px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{ 
                        background: isActive ? 'var(--accent)' : 'var(--bg-primary)',
                        color: isActive ? 'white' : 'var(--text-secondary)'
                      }}
                    >
                      <Globe size={18} />
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{l.native}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{l.name} • {l.region}</p>
                    </div>

                    {isActive && (
                      <div 
                        className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--accent)' }}
                      >
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Close Button Mobile */}
            <div className="mt-6 md:hidden">
               <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full py-3 rounded-xl font-bold text-white transition-colors"
                  style={{ background: 'var(--accent)' }}
               >
                 {t('close')}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
