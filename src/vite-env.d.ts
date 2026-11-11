/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Root of the API on Vercel, e.g. https://<project>.vercel.app — empty ⇒ the app runs without data. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
