import { defineConfig } from 'vitest/config';

// Fuseau fixé pour que les tests de dates soient reproductibles (heure d'été / d'hiver).
process.env.TZ = 'Europe/Paris';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // OpenCV est un module UMD dont l'export est une promesse : on le fait transformer par Vite comme dans le navigateur.
    server: { deps: { inline: ['@techstark/opencv-js'] } },
  },
});
