/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gốc của API trên Vercel, vd. https://<project>.vercel.app — rỗng ⇒ app chạy không dữ liệu. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
