"use client";

import AIChat from "./AIChat";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AIChat />
    </>
  );
}
