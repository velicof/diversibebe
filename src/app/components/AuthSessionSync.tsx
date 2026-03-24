"use client";

import { getSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pullRemoteUserData } from "@/lib/supabaseDataSync";
import { syncGoogleSessionToLocalUser } from "../lib/store";

/**
 * Sincronizează sesiunea Google în localStorage fără useSession (evită refetch-uri
 * la fiecare navigare care ține status „loading” și declanșează writeData în buclă).
 */
export default function AuthSessionSync() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await getSession();
        const email = session?.user?.email;
        if (cancelled || !email) return;
        syncGoogleSessionToLocalUser({
          email,
          name: session.user?.name ?? null,
        });
        await pullRemoteUserData();
      } catch {
        /* ignoră — rețeaua / API indisponibil */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
