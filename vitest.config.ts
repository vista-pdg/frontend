import path from 'path';
import { defineConfig } from 'vitest/config';

/**
 * Pruebas unitarias del frontend (desde HU-18). El núcleo de visualización (`src/core`) es
 * TypeScript puro y se prueba en Node, sin adaptadores de renderizado registrados: es la
 * condición que CA-4 de la HU-18 impone. La cobertura se mide y se exige sólo sobre ese paquete.
 */
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/index.ts', 'src/core/__tests__/**'],
      reporter: ['text', 'text-summary'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 75 },
    },
  },
});
