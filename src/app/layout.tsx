import type { Metadata } from "next";
import Link from "next/link";
import { Press_Start_2P, Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sanderdesnaijer.github.io/eyebrow-tetris";

export const metadata: Metadata = {
  title: {
    default: "Eyebrow Tetris - Control Tetris with Your Face",
    template: "%s | Eyebrow Tetris",
  },
  description:
    "Play Tetris using facial expressions! Raise your eyebrows to move pieces, open your mouth to drop. A fun face-controlled game using AI face detection.",
  metadataBase: new URL(siteUrl),
  keywords: [
    "tetris",
    "face control",
    "eyebrow game",
    "mediapipe",
    "face detection",
    "browser game",
    "facial expressions",
  ],
  authors: [{ name: "Sander de Snaijer" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Eyebrow Tetris - Control Tetris with Your Face",
    description:
      "Play Tetris using your eyebrows and mouth! A unique face-controlled gaming experience.",
    url: siteUrl,
    siteName: "Eyebrow Tetris",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris - Face-controlled Tetris game",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eyebrow Tetris - Control Tetris with Your Face",
    description:
      "Play Tetris using your eyebrows and mouth! A unique face-controlled gaming experience.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <Navigation />
        <main className="min-h-screen pt-14">{children}</main>
        <footer className="mt-12 border-t border-white/5 bg-neutral-950 py-12 text-center">
          <nav className="mb-8 flex flex-wrap justify-center gap-8">
            <Link
              href="/how-to-play"
              className="text-sm uppercase tracking-widest text-neutral-300 transition-colors hover:text-white"
            >
              How to Play
            </Link>
            <Link
              href="/privacy"
              className="text-sm uppercase tracking-widest text-neutral-300 transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:sanderdesnaijer@metsander.com?subject=Question%20about%20Eyebrow%20Tetris"
              className="text-sm uppercase tracking-widest text-neutral-300 transition-colors hover:text-white"
            >
              Contact
            </a>
          </nav>
          <p className="text-xs text-neutral-300">
            © {new Date().getFullYear()} Eyebrow Tetris. All rights reserved.
          </p>
          <a
            href="https://www.sanderdesnaijer.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 inline-flex items-center gap-2 text-xs text-neutral-300 transition-colors hover:text-white"
          >
            <img
              src="/logo-sanderdesnaijer.svg"
              alt="Sander de Snaijer"
              width={20}
              height={20}
              className="opacity-50 transition-opacity group-hover:opacity-75"
            />
            Made by Sander de Snaijer
          </a>
        </footer>
      </body>
    </html>
  );
}
