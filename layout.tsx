import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import 'katex/dist/katex.min.css'; // KaTeX styles for math formulas

export const metadata: Metadata = {
  title: 'ChatNeural — your friendly AI assistant',
  description:
    'ChatNeural is a fast, friendly AI workspace for writing, building, and thinking out loud.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f13' },
  ],
};

const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('chatneural-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = stored ? stored === 'dark' : prefersDark;
      var root = document.documentElement;
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    } catch (e) {}
  })();
`;

const fetchGuardScript = `
  (function() {
    try {
      var originalFetch = window.fetch;
      var currentFetch = originalFetch;
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        enumerable: true,
        get: function() {
          return currentFetch;
        },
        set: function(val) {
          currentFetch = val;
        }
      });
    } catch (e) {
      console.warn('Fetch setter patch failed:', e);
    }
  })();
`;

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: themeInitScript}} />
        <script dangerouslySetInnerHTML={{__html: fetchGuardScript}} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
