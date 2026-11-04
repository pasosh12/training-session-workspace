/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `off` to disable the MSW mock API (for a real backend). */
  readonly VITE_API_MOCKING?: 'off'
  /** Base path for API requests. Defaults to `/api`. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
