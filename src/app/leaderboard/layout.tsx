import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Leaderboard - Top Scores",
  description:
    "Eyebrow Tetris leaderboard — top scores from players who mastered face-controlled Tetris. Compare eyebrow mode and keyboard mode rankings.",
  alternates: {
    canonical: "/leaderboard",
  },
  keywords: [
    "eyebrow tetris leaderboard",
    "eyebrow tetris high scores",
    "face tetris top scores",
    "face controlled game rankings",
  ],
  openGraph: {
    title: "Leaderboard - Eyebrow Tetris Top Scores",
    description:
      "See who mastered face-controlled Tetris. Compare top scores for eyebrow mode and keyboard mode.",
    url: `${SITE_URL}/leaderboard`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris Leaderboard - Top Scores",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Leaderboard - Eyebrow Tetris Top Scores",
    description:
      "See who mastered face-controlled Tetris. Compare top scores for eyebrow mode and keyboard mode.",
    images: ["/og-image.png"],
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Leaderboard", path: "/leaderboard" }]} />
      {children}
    </>
  );
}
