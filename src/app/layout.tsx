import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import Image from "next/image";
import Link from "next/link";
import { Press_Start_2P, Geist, Geist_Mono } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { SITE_URL } from "@/lib/constants";
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

export const metadata: Metadata = {
  title: {
    default:
      "Eyebrow Tetris - Play Tetris with Your Face | Free Online Webcam Game",
    template: "%s | Eyebrow Tetris",
  },
  description:
    "Play Tetris with your face using AI webcam detection. Raise your eyebrows to move pieces, open your mouth to drop. Free browser game — no download needed.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "eyebrow tetris",
    "play tetris with face",
    "face controlled tetris",
    "webcam tetris game",
    "play tetris with webcam",
    "face controlled browser game",
    "eyebrow controlled game",
    "facial expression game",
    "mediapipe face detection game",
    "free online tetris",
    "AI face detection game",
    "browser game no download",
  ],
  authors: [{ name: "Sander de Snaijer", url: "https://www.sanderdesnaijer.com/" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Eyebrow Tetris - Play Tetris with Your Face | Free Online Game",
    description:
      "Play Tetris with your face using AI webcam detection. Raise eyebrows to move, open mouth to drop. Free — no download needed.",
    url: SITE_URL,
    siteName: "Eyebrow Tetris",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris - Face-controlled Tetris game using webcam",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Eyebrow Tetris - Play Tetris with Your Face",
    description:
      "Play Tetris with your face using AI webcam detection. Raise eyebrows to move, open mouth to drop. Free — no download needed.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Eyebrow Tetris",
    url: SITE_URL,
    description:
      "Play Tetris using facial expressions. Raise your eyebrows to move pieces, open your mouth to drop. A free face-controlled browser game powered by AI face detection.",
    applicationCategory: "GameApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: "Sander de Snaijer",
      url: "https://www.sanderdesnaijer.com/",
    },
    browserRequirements:
      "Requires a modern browser with webcam access (Chrome, Firefox, Edge, Safari)",
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navigation />
        <main className="min-h-screen pt-14">{children}</main>
        <footer className="mt-12 border-t border-[var(--blue)]/10 bg-[#06060f] py-12 text-center">
          <nav className="mb-8 flex flex-wrap justify-center gap-8">
            <Link
              href="/"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              Play Eyebrow Tetris
            </Link>
            <Link
              href="/how-to-play"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              How to Play
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              Leaderboard
            </Link>
            <Link
              href="/credits"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              Credits
            </Link>
            <Link
              href="/privacy"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:sanderdesnaijer@metsander.com?subject=Question%20about%20Eyebrow%20Tetris"
              className="text-sm uppercase tracking-widest text-zinc-400 transition-colors hover:text-[var(--blue)]"
            >
              Contact
            </a>
          </nav>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Eyebrow Tetris. All rights reserved.
          </p>
          <a
            href="https://www.sanderdesnaijer.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 inline-flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-[var(--blue)]"
          >
            <Image
              src="/logo-sanderdesnaijer.svg"
              alt="Sander de Snaijer"
              width={20}
              height={20}
              className="opacity-50 transition-opacity group-hover:opacity-75"
            />
            Made by Sander de Snaijer
          </a>
        </footer>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
