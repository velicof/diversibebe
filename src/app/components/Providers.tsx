"use client";

import { SessionProvider } from "next-auth/react";
import AuthSessionSync from "./AuthSessionSync";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <AuthSessionSync />
      {children}
    </SessionProvider>
  );
}
