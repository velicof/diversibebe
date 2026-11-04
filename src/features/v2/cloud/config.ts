// What every V2 page needs to know about the backend, without loading supabase-js (client.ts). A visitor
// with no session never downloads it; it loads on sign-in, or at start when a session is stored.
import { assertAllowedSupabaseUrl, resolveBackendUrl } from "./guard";

export const nativeAuth = process.env.NEXT_PUBLIC_V2_BACKEND_KIND === "supabase-native";
export const AUTH_STORAGE_KEY = "diversibebe:v2:test-auth";
export const AUTH_SIGNED_OUT_KEY = "diversibebe:v2:signed-out";

/** The checked backend address, or null when this build has no accounts. Throws on a forbidden address. */
export function backendUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_V2_SUPABASE_URL;
  if (!configured || !process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY) return null;
  const pageOrigin = typeof window === "undefined" ? undefined : window.location.origin;
  const url = resolveBackendUrl(configured, pageOrigin);
  assertAllowedSupabaseUrl(url, undefined, pageOrigin);
  return url;
}

/** A navigation may abort a network logout: the local intent survives it and removes the session here. */
export function clearSignedOutSession() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(AUTH_SIGNED_OUT_KEY) === "1")
      for (const key of [AUTH_STORAGE_KEY, `${AUTH_STORAGE_KEY}-code-verifier`, `${AUTH_STORAGE_KEY}-user`]) window.localStorage.removeItem(key);
  } catch {
    /* A memory-only session cannot survive a reload. */
  }
}

export function hasStoredSession(): boolean {
  clearSignedOutSession();
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) !== null;
  } catch {
    return true; // Storage unavailable: let the client decide.
  }
}
