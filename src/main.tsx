import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getStoredTheme, applyThemeToDOM } from './services/themeService.ts';

applyThemeToDOM(getStoredTheme());

const root = createRoot(document.getElementById('root')!);
const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

if (pathname === '/' || pathname === '/index.html') {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  document.title = 'Page not found | DreamLM';
  const robotsDirective = document.createElement('meta');
  robotsDirective.name = 'robots';
  robotsDirective.content = 'noindex, follow';
  document.head.append(robotsDirective);

  root.render(
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface p-6 text-center text-on-surface">
      <h1 className="font-headline-lg text-headline-lg text-primary">Page not found</h1>
      <p className="text-sm text-on-surface-variant">The page you requested is not available.</p>
      <a className="text-secondary underline underline-offset-4" href="/">Return to DreamLM</a>
    </main>,
  );
}
