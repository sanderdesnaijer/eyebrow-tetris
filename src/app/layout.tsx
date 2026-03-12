import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eyebrow Tetris",
  description: "Eyebrow Tetris",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
