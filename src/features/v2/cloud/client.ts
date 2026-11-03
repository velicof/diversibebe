"use client";
import { createClient } from "@supabase/supabase-js";
import { assertAllowedSupabaseUrl } from "./guard";
import { V2Repository } from "./repository";
export const nativeAuth = process.env.NEXT_PUBLIC_V2_BACKEND_KIND === "supabase-native";
let repository: V2Repository | null = null;
export const AUTH_STORAGE_KEY = "diversibebe:v2:test-auth";
export const AUTH_SIGNED_OUT_KEY = "diversibebe:v2:signed-out";
export function getV2Repository(): V2Repository | null {
  const url = process.env.NEXT_PUBLIC_V2_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_V2_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  assertAllowedSupabaseUrl(url);
  if (!repository) {
    // A navigation may abort network logout. The local intent must survive it.
    if(typeof window!=="undefined")try{if(localStorage.getItem(AUTH_SIGNED_OUT_KEY)==="1"){
      for(const key of [AUTH_STORAGE_KEY,AUTH_STORAGE_KEY+"-code-verifier",AUTH_STORAGE_KEY+"-user"])localStorage.removeItem(key);
    }}catch{/* A memory-only session cannot survive a reload. */}
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
