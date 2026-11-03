"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clearLegacyRegistrationCredentials } from "@/lib/security/registration-credentials";

// Still server-rendered on V1 pages, but in its own chunk: /v2 never renders it, so V2 pages no longer
// download the V1 store and recipe database it depends on.
const AIChat = dynamic(() => import("./AIChat"));

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  useEffect(() => { try { clearLegacyRegistrationCredentials(window.localStorage); } catch { /* Storage disabled. */ } try { clearLegacyRegistrationCredentials(window.sessionStorage); } catch { /* Storage disabled. */ } }, []);
  if (pathname.startsWith("/v2")) return <>{children}</>;
  return (
    <>
      {children}
      <AIChat />
    </>
  );
}
