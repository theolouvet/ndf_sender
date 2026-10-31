import { defineConfig } from 'vitest/config';

// Fuseau fixé pour que les tests de dates soient reproductibles (heure d'été / d'hiver).
process.env.TZ = 'Europe/Paris';

export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
