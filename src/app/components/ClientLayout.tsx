"use client";

import AIChat from "./AIChat";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-28">{children}</div>
      <AIChat />
    </>
  );
}
