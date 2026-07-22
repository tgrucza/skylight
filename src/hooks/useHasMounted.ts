import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the client has hydrated. Used to defer portal-based
 * components (Modal, Toast) until after hydration without a setState-in-effect
 * (which both trips the react-hooks lint rule and, done naively, causes a
 * hydration mismatch since the client's first render already sees `window`).
 */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
