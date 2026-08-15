/**
 * useObservableState.ts — Lightweight observable state hook.
 *
 * A minimalist state management pattern using React hooks.
 * No external dependencies. Supports:
 *   - State subscription
 *   - Immutable updates
 *   - Middleware (logging, persistence)
 *   - Derived state (selectors)
 */

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';

// ── Types ──

export type Listener<T> = (state: T) => void;
export type Updater<T> = (prev: T) => T;
export type Middleware<T> = (next: T, prev: T) => T;

// ── Observable Store ──

export class ObservableStore<T extends Record<string, unknown>> {
  private _state: T;
  private _listeners = new Set<Listener<T>>();
  private _middleware: Middleware<T>[] = [];

  constructor(initialState: T) {
    this._state = { ...initialState };
  }

  /** Get current state (snapshot). */
  getState(): Readonly<T> {
    return this._state;
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: Listener<T>): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** Add middleware. */
  use(middleware: Middleware<T>): this {
    this._middleware.push(middleware);
    return this;
  }

  /** Update state immutably. */
  setState(updater: Updater<T>): void {
    const prev = this._state;
    let next = updater(prev);

    for (const mw of this._middleware) {
      next = mw(next, prev);
    }

    this._state = next;
    this._notify(next);
  }

  /** Partial update (shallow merge). */
  patch(partial: Partial<T>): void {
    this.setState((prev) => ({ ...prev, ...partial }));
  }

  /** Reset to initial state. */
  reset(initialState: T): void {
    this._state = { ...initialState };
    this._notify(this._state);
  }

  private _notify(state: T): void {
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch {
        // Swallow listener errors
      }
    }
  }
}

// ── React Hook ──

/**
 * Subscribe to an ObservableStore within a React component.
 * Component re-renders when the store state changes.
 */
export function useStore<T extends Record<string, unknown>>(store: ObservableStore<T>): T {
  const subscribe = useCallback(
    (callback: () => void) => store.subscribe(callback),
    [store],
  );
  const getSnapshot = useCallback(() => store.getState(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot) as T;
}

/**
 * Create a selector hook for a store.
 */
export function useSelector<T extends Record<string, unknown>, R>(
  store: ObservableStore<T>,
  selector: (state: T) => R,
): R {
  const subscribe = useCallback(
    (callback: () => void) => store.subscribe(callback),
    [store],
  );
  const getSnapshot = useCallback(
    () => selector(store.getState() as T),
    [store, selector],
  );
  return useSyncExternalStore(subscribe, getSnapshot) as R;
}

/**
 * Create a simple in-component observable store.
 */
export function useLocalStore<T extends Record<string, unknown>>(initialState: T) {
  const storeRef = useRef<ObservableStore<T> | null>(null);
  if (!storeRef.current) {
    storeRef.current = new ObservableStore<T>(initialState);
  }

  const state = useStore(storeRef.current);

  const setState = useCallback((updater: Updater<T>) => {
    storeRef.current?.setState(updater);
  }, []);

  const patch = useCallback((partial: Partial<T>) => {
    storeRef.current?.patch(partial);
  }, []);

  return { state, setState, patch, store: storeRef.current };
}
