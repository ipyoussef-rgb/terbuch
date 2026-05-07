import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Terbuch — Terminbuchung",
  description:
    "Termine bei Bürgerservice, Fahrerlaubnis und Standesamt — sicher mit KOBIL Identity.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2E4FFF",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-white text-[var(--color-kobil-navy)] antialiased">
        {children}
      </body>
    </html>
  );
}
