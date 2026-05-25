import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tier List Maker",
  description: "Create local tier lists and export them as images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
