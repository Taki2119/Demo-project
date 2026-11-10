import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// GitHub Pages phục vụ ở https://<user>.github.io/<repo>/ ⇒ base = '/<repo>/'.
// Đổi repo hoặc dùng domain riêng thì đặt VITE_BASE_PATH lúc build (domain riêng: '/').
const base = process.env.VITE_BASE_PATH ?? '/Demo-project/';

export default defineConfig({
  base,
  plugins: [react()],
  // Dev: chuyển /api sang `npm run api:dev` (cổng 3001) ⇒ chạy app với
  //   VITE_API_URL=http://localhost:5173 npm run dev   (cùng origin, không cần CORS)
  server: { proxy: { '/api': 'http://localhost:3001' } },
  test: {
    // Chỉ test của web app. supabase/tests/*.test.mjs chạy bằng `node --test` (npm run db:test).
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'threads',
  },
});
