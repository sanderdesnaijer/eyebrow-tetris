import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Credits - Sound Effects & Music Attribution",
  description:
    "Credits and attribution for the sound effects and music used in Eyebrow Tetris. All audio sourced from Pixabay with proper licensing.",
  alternates: {
    canonical: "/credits",
  },
  keywords: [
    "eyebrow tetris credits",
    "eyebrow tetris sound effects",
    "eyebrow tetris music",
    "game audio credits",
    "pixabay attribution",
  ],
  openGraph: {
    title: "Credits - Eyebrow Tetris Sound Effects & Music",
    description:
      "Attribution for the sound effects and music used in Eyebrow Tetris. All audio sourced from Pixabay.",
    url: `${SITE_URL}/credits`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris Credits",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credits - Eyebrow Tetris Sound Effects & Music",
    description:
      "Attribution for the sound effects and music used in Eyebrow Tetris. All audio sourced from Pixabay.",
    images: ["/og-image.png"],
  },
};

const soundCredits = [
  {
    label: "Move & Rotate",
    author: "Alexander Jauk",
    authorUrl:
      "https://pixabay.com/users/alex_jauk-16800354/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=293062",
    sourceUrl:
      "https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=293062",
  },
  {
    label: "Hard Fall",
    author: "freesound_community",
    authorUrl:
      "https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=106687",
    sourceUrl:
      "https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=106687",
  },
  {
    label: "Clear Line",
    author: "floraphonic",
    authorUrl:
      "https://pixabay.com/users/floraphonic-38928062/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=177983",
    sourceUrl:
      "https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=177983",
  },
  {
    label: "Game Over",
    author: "Alphix",
    authorUrl:
      "https://pixabay.com/users/alphix-52619918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=417465",
    sourceUrl:
      "https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=417465",
  },
];

const musicCredits = [
  {
    label: "Soundtrack",
    author: "Gregor Quendel",
    authorUrl:
      "https://pixabay.com/users/gregorquendel-19912121/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=185592",
    sourceUrl:
      "https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=185592",
  },
];

export default function CreditsPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Credits", path: "/credits" }]} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="neon-text-cyan pixel-font mb-8 text-2xl text-[var(--blue)]">
          CREDITS
        </h1>

        <div className="space-y-8 text-zinc-300">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
              Created by
            </h2>
            <div className="neon-card rounded-lg px-5 py-4">
              <p className="font-medium text-zinc-200">Sander de Snaijer</p>
              <p className="mt-1 text-sm text-zinc-400">
                Design, development &amp; gameplay by{" "}
                <a
                  href="https://www.sanderdesnaijer.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--blue)] hover:underline"
                >
                  sanderdesnaijer.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
              Sound Effects
            </h2>
            <div className="space-y-3">
              {soundCredits.map((credit) => (
                <div
                  key={credit.label}
                  className="neon-card rounded-lg px-5 py-4"
                >
                  <p className="font-medium text-zinc-200">{credit.label}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Sound Effect by{" "}
                    <a
                      href={credit.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--blue)] hover:underline"
                    >
                      {credit.author}
                    </a>{" "}
                    from{" "}
                    <a
                      href={credit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--blue)] hover:underline"
                    >
                      Pixabay
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
              Music
            </h2>
            <div className="space-y-3">
              {musicCredits.map((credit) => (
                <div
                  key={credit.label}
                  className="neon-card rounded-lg px-5 py-4"
                >
                  <p className="font-medium text-zinc-200">{credit.label}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Music by{" "}
                    <a
                      href={credit.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--blue)] hover:underline"
                    >
                      {credit.author}
                    </a>{" "}
                    from{" "}
                    <a
                      href={credit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--blue)] hover:underline"
                    >
                      Pixabay
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
              Technology
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-zinc-200">MediaPipe</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Face detection powered by{" "}
                  <a
                    href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--blue)] hover:underline"
                  >
                    Google MediaPipe
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-medium text-zinc-200">Next.js</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Built with{" "}
                  <a
                    href="https://nextjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--blue)] hover:underline"
                  >
                    Next.js
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section className="border-t border-[var(--blue)]/10 pt-6">
            <p className="text-sm text-zinc-500">
              All audio is licensed under the{" "}
              <a
                href="https://pixabay.com/service/license-summary/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--blue)] hover:underline"
              >
                Pixabay Content License
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
