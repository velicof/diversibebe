"use client";

import AIChat from "./AIChat";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clearLegacyRegistrationCredentials } from "@/lib/security/registration-credentials";

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
