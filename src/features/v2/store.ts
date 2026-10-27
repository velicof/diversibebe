"use client";
import {
  appReducer,
  emptyState,
  readState,
  type Action,
  type AppState,
} from "./model";
import { catalog, ingredients } from "./catalog";
import { normalize } from "./review";

const KEY = "diversibebe:v2:isolated-preview:1";
type Snapshot = { state: AppState; ready: boolean; storageError: boolean };
const initial: Snapshot = {
  state: emptyState,
  ready: false,
  storageError: false,
};
let snapshot = initial;
const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
export const previewStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => initial,
  hydrate() {
    if (snapshot.ready) return;
    try {
      const state = readState(
        window.localStorage.getItem(KEY),
        new Set(catalog.map((r) => r.id)),
        new Set(ingredients.map((i) => i.id)),
        new Set(
          catalog.flatMap((r) => r.ingredients.map((i) => normalize(i).trim())),
        ),
      );
      snapshot = { state, ready: true, storageError: false };
    } catch {
      snapshot = { state: { ...emptyState }, ready: true, storageError: true };
    }
    emit();
  },
  dispatch(action: Action) {
    const next = appReducer(snapshot.state, action);
    snapshot = { ...snapshot, state: next };
    try {
      // Session diagnostics are not persisted and never transmitted.
      if (action.type === "reset") window.localStorage.removeItem(KEY);
      else if (action.type !== "event")
        window.localStorage.setItem(
          KEY,
          JSON.stringify({ ...next, events: [] }),
        );
    } catch {
      snapshot = { ...snapshot, storageError: true };
    }
    emit();
  },
};
