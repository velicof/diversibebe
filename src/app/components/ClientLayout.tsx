"use client";

import AIChat from "./AIChat";
import { useEffect } from "react";
import { clearLegacyRegistrationCredentials } from "@/lib/security/registration-credentials";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    try { clearLegacyRegistrationCredentials(window.localStorage); } catch { /* Storage unavailable. */ }
    try { clearLegacyRegistrationCredentials(window.sessionStorage); } catch { /* Storage unavailable. */ }
  }, []);
  return (
    <>
      {children}
      <AIChat />
    </>
  );
}
