"use client";
import { createClient } from "@supabase/supabase-js";
import { AUTH_STORAGE_KEY, backendUrl, clearSignedOutSession, nativeAuth } from "./config";
import { V2Repository } from "./repository";
export { nativeAuth };
let repository: V2Repository | null = null;
export function getV2Repository(): V2Repository | null {
  const url = backendUrl();
  const key = process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!repository) {
    clearSignedOutSession();
    repository = new V2Repository(
      createClient(url, key, {
        auth: {
          storageKey: AUTH_STORAGE_KEY,
          flowType: nativeAuth ? "pkce" : "implicit",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: {
          fetch: (input, init) => {
            const target = new URL(
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url,
            );
            if (target.origin !== new URL(url).origin)
              throw new Error("Non-test destination blocked");
            return fetch(input, {
              ...init,
              signal: init?.signal ?? AbortSignal.timeout(12000),
            });
          },
        },
      }),
    );
  }
  return repository;
}
