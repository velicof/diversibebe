import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termeni și condiții",
  alternates: { canonical: "/termeni" },
};

export default function TermeniLayout({ children }: { children: React.ReactNode }) {
  return children;
}
