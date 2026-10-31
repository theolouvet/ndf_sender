import { defineConfig } from 'vite';

// Chemins relatifs : l'appli peut être servie depuis n'importe quel sous-dossier (GitHub Pages).
// Les chunks chargés à la demande (OpenCV…) sont préfixés « lazy- » : le service worker ne les purge jamais.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 12000,
    rollupOptions: { output: { chunkFileNames: 'assets/lazy-[name]-[hash].js' } },
  },
});
