'use client';

import { useState, useEffect } from 'react';
import { Globe, Check, Languages } from 'lucide-react';

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
  const [selectedLang, setSelectedLang] = useState('en');

  useEffect(() => {
    const saved = localStorage.getItem('ch-language');
    if (saved) setSelectedLang(saved);
  }, []);

  const handleSelect = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem('ch-language', code);
    // In a real app, this might trigger i18n changes or page reload
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
        <Languages size={18} />
        <span className="text-sm font-bold uppercase tracking-widest">Select Language</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {languages.map((lang) => {
          const isActive = selectedLang === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
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
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{lang.native}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{lang.name} • {lang.region}</p>
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
    </div>
  );
}
