/**
 * Empty stub aliased in place of Node built-ins (fs, path) in browser bundles
 * under Turbopack (`next dev`). The webpack production build gets the same
 * treatment via `resolve.fallback` in next.config.ts. re2-wasm references fs
 * for its Node loading path, which the browser/worker bundle never executes.
 */
const emptyModule = {};
export default emptyModule;
