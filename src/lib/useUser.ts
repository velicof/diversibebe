"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

/** Last access_token we successfully wrote to `login_events`. */
let lastLoginEventAccessToken: string | null = null;
/** In-flight insert for this token (blocks duplicate SIGNED_IN before await). */
let loginEventInsertInFlight: string | null = null;

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // login_events: ONLY on explicit sign-in. Never on token refresh, initial hydrate, etc.
      if (event === "SIGNED_OUT") {
        lastLoginEventAccessToken = null;
        loginEventInsertInFlight = null;
        return;
      }
      if (event !== "SIGNED_IN") {
        return;
      }

      const userId = session?.user?.id;
      const accessToken = session?.access_token;
      if (!userId || !accessToken) return;

      // Same session token → already logged (e.g. duplicate SIGNED_IN / React Strict Mode).
      if (accessToken === lastLoginEventAccessToken) return;
      if (accessToken === loginEventInsertInFlight) return;
      loginEventInsertInFlight = accessToken;

      void (async () => {
        try {
          await supabase.from("login_events").insert({
            user_id: userId,
            platform: "web",
          });
          lastLoginEventAccessToken = accessToken;
        } catch {
          /* nu blocăm fluxul principal */
        } finally {
          if (loginEventInsertInFlight === accessToken) {
            loginEventInsertInFlight = null;
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, userId: user?.id };
}
