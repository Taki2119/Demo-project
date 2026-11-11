import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves at https://<user>.github.io/<repo>/ ⇒ base = '/<repo>/'.
// If the repo is renamed or a custom domain is used, set VITE_BASE_PATH at build time (custom domain: '/').
const base = process.env.VITE_BASE_PATH ?? '/Demo-project/';

export default defineConfig({
  base,
  plugins: [react()],
  // Dev: forward /api to `npm run api:dev` (port 3001) ⇒ run the app with
  //   VITE_API_URL=http://localhost:5173 npm run dev   (same origin, no CORS needed)
  server: { proxy: { '/api': 'http://localhost:3001' } },
  test: {
    // Web app tests only. supabase/tests/*.test.mjs run with `node --test` (npm run db:test).
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'threads',
  },
});
