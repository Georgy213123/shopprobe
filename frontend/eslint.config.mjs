import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Картинки отдаёт API с заданными width/height, оптимизатор Next им не нужен.
  { rules: { '@next/next/no-img-element': 'off' } },
  globalIgnores(['.next', 'out', 'coverage', 'next-env.d.ts']),
]);
