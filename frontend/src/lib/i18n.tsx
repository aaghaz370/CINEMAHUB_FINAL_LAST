'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Translations = Record<string, string>;

const dictionaries: Record<string, Translations> = {
  en: {
    home: 'Home',
    search: 'Search',
    movies: 'Movies',
    tv_shows: 'TV Shows',
    anime: 'Anime',
    settings: 'Settings',
    search_placeholder: 'Search movies, series, anime...',
    trending_now: 'Trending Now',
    watch_now: 'Watch Now',
    my_list: '+ My List',
    appearance: 'Appearance',
    language_region: 'Language & Region',
    select_language: 'Select Language',
    manage_experience: 'Manage your experience. Currently in',
    day_mode: 'Day Mode',
    night_mode: 'Night Mode',
    day_themes: 'Day Mode Themes',
    night_themes: 'Night Mode Themes',
    close: 'Close'
  },
  hi: {
    home: 'होम',
    search: 'खोजें',
    movies: 'फिल्में',
    tv_shows: 'टीवी शो',
    anime: 'एनीमे',
    settings: 'सेटिंग्स',
    search_placeholder: 'फिल्में, सीरीज, एनीमे खोजें...',
    trending_now: 'अभी ट्रेंडिंग',
    watch_now: 'अभी देखें',
    my_list: '+ मेरी सूची',
    appearance: 'दिखावट',
    language_region: 'भाषा और क्षेत्र',
    select_language: 'भाषा चुनें',
    manage_experience: 'अपना अनुभव प्रबंधित करें। वर्तमान में',
    day_mode: 'दिन मोड',
    night_mode: 'रात मोड',
    day_themes: 'दिन के थीम्स',
    night_themes: 'रात के थीम्स',
    close: 'बंद करें'
  },
  es: {
    home: 'Inicio',
    search: 'Buscar',
    movies: 'Películas',
    tv_shows: 'Programas TV',
    anime: 'Anime',
    settings: 'Ajustes',
    search_placeholder: 'Buscar películas, series, anime...',
    trending_now: 'Tendencias ahora',
    watch_now: 'Ver ahora',
    my_list: '+ Mi lista',
    appearance: 'Apariencia',
    language_region: 'Idioma y Región',
    select_language: 'Seleccionar idioma',
    manage_experience: 'Administra tu experiencia. Actualmente en',
    day_mode: 'Modo Día',
    night_mode: 'Modo Noche',
    day_themes: 'Temas Modo Día',
    night_themes: 'Temas Modo Noche',
    close: 'Cerrar'
  },
  fr: {
    home: 'Accueil',
    search: 'Rechercher',
    movies: 'Films',
    tv_shows: 'Séries TV',
    anime: 'Animé',
    settings: 'Paramètres',
    search_placeholder: 'Rechercher films, séries, anime...',
    trending_now: 'Tendances',
    watch_now: 'Regarder',
    my_list: '+ Ma Liste',
    appearance: 'Apparence',
    language_region: 'Langue & Région',
    select_language: 'Choisir la langue',
    manage_experience: 'Gérez votre expérience. Actuellement en',
    day_mode: 'Mode Jour',
    night_mode: 'Mode Nuit',
    day_themes: 'Thèmes Jour',
    night_themes: 'Thèmes Nuit',
    close: 'Fermer'
  },
  de: {
    home: 'Start',
    search: 'Suche',
    movies: 'Filme',
    tv_shows: 'Serien',
    anime: 'Anime',
    settings: 'Einstellungen',
    search_placeholder: 'Filme, Serien, Anime suchen...',
    trending_now: 'Im Trend',
    watch_now: 'Jetzt ansehen',
    my_list: '+ Meine Liste',
    appearance: 'Erscheinungsbild',
    language_region: 'Sprache & Region',
    select_language: 'Sprache auswählen',
    manage_experience: 'Erlebnis verwalten. Aktuell im',
    day_mode: 'Tagmodus',
    night_mode: 'Nachtmodus',
    day_themes: 'Tag-Themes',
    night_themes: 'Nacht-Themes',
    close: 'Schließen'
  },
  ja: {
    home: 'ホーム',
    search: '検索',
    movies: '映画',
    tv_shows: 'テレビ番組',
    anime: 'アニメ',
    settings: '設定',
    search_placeholder: '映画、シリーズ、アニメを検索...',
    trending_now: 'トレンド',
    watch_now: '今すぐ見る',
    my_list: '+ マイリスト',
    appearance: '外観',
    language_region: '言語と地域',
    select_language: '言語を選択',
    manage_experience: '体験を管理。現在',
    day_mode: '昼モード',
    night_mode: '夜モード',
    day_themes: '昼テーマ',
    night_themes: '夜テーマ',
    close: '閉じる'
  },
  ko: {
    home: '홈',
    search: '검색',
    movies: '영화',
    tv_shows: 'TV 쇼',
    anime: '애니메이션',
    settings: '설정',
    search_placeholder: '영화, 시리즈, 애니메이션 검색...',
    trending_now: '지금 뜨는 콘텐츠',
    watch_now: '지금 시청',
    my_list: '+ 내 목록',
    appearance: '모양',
    language_region: '언어 및 지역',
    select_language: '언어 선택',
    manage_experience: '경험 관리. 현재',
    day_mode: '주간 모드',
    night_mode: '야간 모드',
    day_themes: '주간 테마',
    night_themes: '야간 테마',
    close: '닫기'
  },
  ar: {
    home: 'الرئيسية',
    search: 'بحث',
    movies: 'أفلام',
    tv_shows: 'برامج تلفزيونية',
    anime: 'أنمي',
    settings: 'إعدادات',
    search_placeholder: 'ابحث عن أفلام، مسلسلات، أنمي...',
    trending_now: 'الرائج الآن',
    watch_now: 'شاهد الآن',
    my_list: '+ قائمتي',
    appearance: 'المظهر',
    language_region: 'اللغة والمنطقة',
    select_language: 'اختر اللغة',
    manage_experience: 'إدارة تجربتك. حاليا في',
    day_mode: 'الوضع النهاري',
    night_mode: 'الوضع الليلي',
    day_themes: 'ثيمات النهار',
    night_themes: 'ثيمات الليل',
    close: 'إغلاق'
  },
  zh: {
    home: '首页',
    search: '搜索',
    movies: '电影',
    tv_shows: '电视剧',
    anime: '动漫',
    settings: '设置',
    search_placeholder: '搜索电影、剧集、动漫...',
    trending_now: '现在流行',
    watch_now: '立即观看',
    my_list: '+ 我的列表',
    appearance: '外观',
    language_region: '语言和地区',
    select_language: '选择语言',
    manage_experience: '管理您的体验。当前为',
    day_mode: '白天模式',
    night_mode: '夜间模式',
    day_themes: '白天主题',
    night_themes: '夜间主题',
    close: '关闭'
  },
  ru: {
    home: 'Главная',
    search: 'Поиск',
    movies: 'Фильмы',
    tv_shows: 'Сериалы',
    anime: 'Аниме',
    settings: 'Настройки',
    search_placeholder: 'Поиск фильмов, сериалов, аниме...',
    trending_now: 'В тренде',
    watch_now: 'Смотреть',
    my_list: '+ Мой список',
    appearance: 'Внешний вид',
    language_region: 'Язык и регион',
    select_language: 'Выберите язык',
    manage_experience: 'Управление опытом. Сейчас',
    day_mode: 'Дневной',
    night_mode: 'Ночной',
    day_themes: 'Дневные темы',
    night_themes: 'Ночные темы',
    close: 'Закрыть'
  },
  pt: {
    home: 'Início',
    search: 'Buscar',
    movies: 'Filmes',
    tv_shows: 'Séries',
    anime: 'Anime',
    settings: 'Configurações',
    search_placeholder: 'Buscar filmes, séries, anime...',
    trending_now: 'Em alta agora',
    watch_now: 'Assistir Agora',
    my_list: '+ Minha Lista',
    appearance: 'Aparência',
    language_region: 'Idioma e Região',
    select_language: 'Selecione o idioma',
    manage_experience: 'Gerencie sua experiência. Atualmente no',
    day_mode: 'Modo Dia',
    night_mode: 'Modo Noite',
    day_themes: 'Temas Modo Dia',
    night_themes: 'Temas Modo Noite',
    close: 'Fechar'
  },
  it: {
    home: 'Home',
    search: 'Cerca',
    movies: 'Film',
    tv_shows: 'Serie TV',
    anime: 'Anime',
    settings: 'Impostazioni',
    search_placeholder: 'Cerca film, serie, anime...',
    trending_now: 'In Tendenza',
    watch_now: 'Guarda Ora',
    my_list: '+ La Mia Lista',
    appearance: 'Aspetto',
    language_region: 'Lingua e Regione',
    select_language: 'Seleziona Lingua',
    manage_experience: 'Gestisci la tua esperienza. Attualmente in',
    day_mode: 'Modalità Giorno',
    night_mode: 'Modalità Notte',
    day_themes: 'Temi Giorno',
    night_themes: 'Temi Notte',
    close: 'Chiudi'
  }
};

interface LanguageContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ch-language') || 'en';
    setLangState(saved);
    setMounted(true);
  }, []);

  const setLang = (l: string) => {
    setLangState(l);
    localStorage.setItem('ch-language', l);
  };

  const t = (key: string) => {
    if (!mounted) return dictionaries['en'][key] || key; // fallback to en during SSR
    return dictionaries[lang]?.[key] || dictionaries['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}
