import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewProvider } from "@/features/v2/Provider";
import { Shell } from "@/features/v2/components";
import "./v2.css";
import "./growth.css";
export const metadata: Metadata = {
  metadataBase: new URL("http://127.0.0.1:3100"),
  title: {
    default: "DiversiBebe - Mese mici, momente mari",
    template: "%s · DiversiBebe",
  },
  description: "Idei de mese, un plan simplu și mai mult timp împreună.",
  robots: { index: false, follow: false },
  manifest: "/v2/manifest.webmanifest",
  alternates: { canonical: "/v2" },
  icons: { icon: "/v2/icon.svg", apple: "/v2/icon-192.png" },
  openGraph: { title: "DiversiBebe · Mese mici, momente mari", description: "Idei, un plan simplu și mai mult timp împreună.", locale: "ro_RO", type: "website", images: [{ url: "/v2/og.png", width: 1200, height: 630 }] },
};
export default function V2Layout({ children }: { children: React.ReactNode }) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DIVERSIBEBE_V2_PREVIEW !== "1"
  )
    notFound();
  return (
    <div className="v2-root">
      <PreviewProvider>
        <Shell>{children}</Shell>
      </PreviewProvider>
    </div>
  );
}
