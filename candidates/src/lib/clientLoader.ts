/**
 * TanStack Router only runs `clientLoader` on client navigations unless `hydrate` is set.
 * Without it, SSR/hard-refresh shows empty server loader data until the user interacts.
 */
export function clientLoaderWithHydrate<T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
): T {
  return Object.assign(fn, { hydrate: true }) as T;
}

/**
 * Server loader stub — always returns the empty skeleton.
 * The hydrated `clientLoader` is solely responsible for fetching real data
 * on both client navigations and hard refreshes. If `loader` also ran
 * `load()` in the browser it would race with `clientLoader` and whichever
 * resolved last would win, sometimes returning stale/empty data.
 */
export function ssrEmptyLoader<T>(empty: T): () => Promise<T> {
  return async () => empty;
}
