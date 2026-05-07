import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terbuch — Terminbuchung",
  description: "Termine bei Bürgerservice, Fahrerlaubnis und Standesamt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
