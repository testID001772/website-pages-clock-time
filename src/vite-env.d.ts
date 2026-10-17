/// <reference types="vite/client" />

/**
 * The environment variables this app reads from `import.meta.env`.
 *
 * Only `VITE_`-prefixed keys are inlined into the client bundle; `BASE_URL` is
 * Vite's own and already typed by `vite/client`, so it needs no declaration
 * here. Augmenting `ImportMetaEnv` rather than casting at each use keeps the
 * names spelled once.
 */
interface ImportMetaEnv {
  /**
   * Overrides the release endpoint the `/download` page links at. Leave unset
   * to use this repository's own releases.
   */
  readonly VITE_RELEASE_BASE?: string;
}
