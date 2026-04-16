"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

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

      if (event === "SIGNED_IN" && session?.user?.id) {
        void (async () => {
          try {
            await supabase.from("login_events").insert({
              user_id: session.user.id,
              platform: "web",
            });
          } catch {
            /* nu blocăm fluxul principal */
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, userId: user?.id };
}
