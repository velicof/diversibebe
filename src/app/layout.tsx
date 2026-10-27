import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";
import Providers from "./components/Providers";

const geistSans = localFont({
  src: "../../public/v2/dm-sans.ttf",
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DiversiBebe - Idei de mese pentru copilul tău",
  description: "Rețete, idei de mese și organizarea diversificării într-un singur loc.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
