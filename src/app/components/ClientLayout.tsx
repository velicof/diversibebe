"use client";

import AIChat from "./AIChat";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/v2")) return <>{children}</>;
  return (
    <>
      {children}
      <AIChat />
    </>
  );
}
