import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "How to Play Eyebrow Tetris - Face & Webcam Controls Guide",
  description:
    "Learn how to play Eyebrow Tetris — the free webcam Tetris game controlled by facial expressions. Master eyebrow and mouth gestures for face-controlled gaming.",
  alternates: {
    canonical: "/how-to-play",
  },
  keywords: [
    "how to play eyebrow tetris",
    "face tetris controls",
    "webcam game controls",
    "facial expression gaming tutorial",
    "eyebrow game instructions",
    "play tetris with face guide",
  ],
  openGraph: {
    title: "How to Play Eyebrow Tetris - Face & Webcam Controls Guide",
    description:
      "Master the face controls: raise eyebrows to move, open mouth to drop. Complete guide to playing Tetris with your webcam.",
    url: `${SITE_URL}/how-to-play`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris - How to play with face controls",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Play Eyebrow Tetris - Face Controls Guide",
    description:
      "Master the face controls: raise eyebrows to move, open mouth to drop. Complete guide to playing Tetris with your webcam.",
    images: ["/og-image.png"],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do you play Eyebrow Tetris?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Raise your left eyebrow to move pieces left, right eyebrow to move right, both eyebrows to rotate, and open your mouth to drop pieces faster. You can also use keyboard controls (arrow keys or WASD) as a backup.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a webcam to play Eyebrow Tetris?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Eyebrow Tetris uses your webcam with AI face detection (Google MediaPipe) to read your facial expressions. All processing happens locally in your browser — no video is ever sent to any server.",
      },
    },
    {
      "@type": "Question",
      name: "Is Eyebrow Tetris free to play?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, Eyebrow Tetris is completely free to play in your browser. No download or installation required.",
      },
    },
    {
      "@type": "Question",
      name: "Which browsers support Eyebrow Tetris?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Eyebrow Tetris works on modern browsers that support the webcam API, including Chrome, Firefox, Edge, and Safari. For the best experience, use Chrome or Edge on desktop.",
      },
    },
  ],
};

export default function HowToPlayPage() {
  const controls = [
    {
      gesture: "Raise Left Eyebrow",
      action: "Move piece left",
      icon: "←",
      tip: "Raise just your left eyebrow while keeping your right eyebrow relaxed",
    },
    {
      gesture: "Raise Right Eyebrow",
      action: "Move piece right",
      icon: "→",
      tip: "Raise just your right eyebrow while keeping your left eyebrow relaxed",
    },
    {
      gesture: "Raise Both Eyebrows",
      action: "Rotate piece",
      icon: "↻",
      tip: "Raise both eyebrows at the same time to rotate the current piece",
    },
    {
      gesture: "Open Mouth",
      action: "Soft drop",
      icon: "↓",
      tip: "Open your mouth to drop the piece faster (accelerates the longer you hold)",
    },
    {
      gesture: "Both Brows + Mouth",
      action: "Hard drop",
      icon: "⬇",
      tip: "Raise both eyebrows and open your mouth to instantly drop the piece to the bottom",
    },
  ];

  const keyboardControls = [
    { key: "← / A", action: "Move left" },
    { key: "→ / D", action: "Move right" },
    { key: "↑ / W", action: "Rotate" },
    { key: "↓ / S", action: "Soft drop" },
    { key: "Space", action: "Hard drop" },
    { key: "P", action: "Pause game" },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "How to Play", path: "/how-to-play" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="pixel-font mb-8 text-center text-2xl text-[var(--blue)]">
          HOW TO PLAY
        </h1>

      <div className="space-y-12">
        <section>
          <h2 className="mb-6 text-xl font-semibold text-[var(--accent)]">
            Face Controls
          </h2>
          <p className="mb-6 text-zinc-400">
            Eyebrow Tetris uses your camera to detect facial expressions. Here
            are the gestures you&apos;ll need to master:
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {controls.map((control) => (
              <div
                key={control.gesture}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-xl text-[var(--accent)]">
                    {control.icon}
                  </span>
                  <div>
                    <h3 className="font-medium text-white">{control.gesture}</h3>
                    <p className="text-sm text-[var(--accent)]">
                      {control.action}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-zinc-500">{control.tip}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-semibold text-[var(--accent)]">
            Keyboard Controls
          </h2>
          <p className="mb-6 text-zinc-400">
            You can also use your keyboard as a backup or combine it with face
            controls:
          </p>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {keyboardControls.map((control) => (
                  <tr
                    key={control.key}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <code className="rounded bg-zinc-800 px-2 py-1 text-sm text-[var(--accent)]">
                        {control.key}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{control.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-semibold text-[var(--accent)]">
            Tips for Best Results
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-medium text-white">
                1. Good Lighting
              </h3>
              <p className="text-sm text-zinc-400">
                Make sure your face is well-lit, preferably with light coming
                from in front of you. Avoid backlighting (bright windows behind
                you).
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-medium text-white">
                2. Face the Camera
              </h3>
              <p className="text-sm text-zinc-400">
                Position yourself so your full face is visible in the camera.
                The detection works best when you&apos;re looking directly at
                the screen.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-medium text-white">
                3. Exaggerate Movements
              </h3>
              <p className="text-sm text-zinc-400">
                Don&apos;t be subtle! Raise your eyebrows high and open your
                mouth wide. The gestures need to be clear for reliable
                detection.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-medium text-white">
                4. Watch the Feedback
              </h3>
              <p className="text-sm text-zinc-400">
                The control feedback panel (top-left during gameplay) shows what
                the game is detecting. Use it to calibrate your expressions.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-2 font-medium text-white">
                5. Practice Individual Eyebrows
              </h3>
              <p className="text-sm text-zinc-400">
                Moving one eyebrow at a time can be tricky! Practice raising
                each eyebrow independently. If it&apos;s too hard, you can
                always use keyboard controls.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-xl font-semibold text-[var(--accent)]">
            Scoring
          </h2>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
            <ul className="space-y-3 text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)]">•</span>
                <span>
                  Clear lines to score points. More lines at once = more points.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)]">•</span>
                <span>
                  Points are multiplied by your current level.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)]">•</span>
                <span>
                  Every 10 lines cleared advances you to the next level.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)]">•</span>
                <span>
                  Higher levels mean faster piece drops - more challenging but
                  more rewarding!
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <p className="text-zinc-400">
            Ready to compete? Check the{" "}
            <Link
              href="/leaderboard"
              className="text-[var(--accent)] hover:underline"
            >
              leaderboard
            </Link>{" "}
            to see how you stack up against other players.
          </p>
        </section>
      </div>
    </div>
    </>
  );
}
