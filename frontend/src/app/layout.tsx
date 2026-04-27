import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/lib/i18n";
import LayoutShell from "@/components/layout-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CinemaHub | Premium Streaming",
  description: "Unified streaming from 20+ providers",
};

// This script runs BEFORE React hydrates — no flash/flicker
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('ch-theme') || 'midnight-indigo';
    var mode = localStorage.getItem('ch-mode') || 'dark';
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking script: sets theme BEFORE first paint - eliminates flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            <LayoutShell>
              {children}
            </LayoutShell>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
