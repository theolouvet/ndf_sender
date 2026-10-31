import './style.css';

if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js');

const app = document.querySelector<HTMLElement>('#app')!;
if (location.search.includes('debug-scan')) void import('./scan/debug').then((m) => m.pageDebug(app));
else app.textContent = 'Notes de frais';
