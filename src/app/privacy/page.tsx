import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Eyebrow Tetris - how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="pixel-font mb-8 text-2xl text-[var(--blue)]">
        PRIVACY POLICY
      </h1>

      <div className="space-y-8 text-zinc-300">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Camera Usage
          </h2>
          <p className="leading-relaxed text-zinc-400">
            Eyebrow Tetris uses your device&apos;s camera to detect facial
            expressions for game controls. The camera feed is processed entirely
            in your browser using MediaPipe&apos;s face detection technology.{" "}
            <strong className="text-zinc-300">
              No video or images are ever transmitted to our servers or any
              third party.
            </strong>
          </p>
          <p className="mt-3 leading-relaxed text-zinc-400">
            Camera access is only active while you&apos;re playing the game.
            When you exit the game or close the browser tab, the camera stream
            is immediately stopped.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Data We Collect
          </h2>
          <p className="leading-relaxed text-zinc-400">
            The only data we store is leaderboard information, which includes:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-400">
            <li>Your chosen nickname (not your real name)</li>
            <li>Your game score, level, and lines cleared</li>
            <li>The date and time you submitted your score</li>
          </ul>
          <p className="mt-3 leading-relaxed text-zinc-400">
            This data is stored in Supabase, a secure database service. We do
            not collect any personal information, email addresses, or tracking
            data.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Local Storage
          </h2>
          <p className="leading-relaxed text-zinc-400">
            We use your browser&apos;s local storage to save:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2 text-zinc-400">
            <li>Your high score (for personal reference)</li>
            <li>Your preferred nickname (for convenience)</li>
            <li>Rate limiting timestamps (to prevent spam submissions)</li>
          </ul>
          <p className="mt-3 leading-relaxed text-zinc-400">
            This data never leaves your device and can be cleared by clearing
            your browser data.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Third-Party Services
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-zinc-200">MediaPipe</h3>
              <p className="mt-1 text-sm text-zinc-400">
                We use Google&apos;s MediaPipe library for face detection. The
                ML model is downloaded from Google&apos;s CDN but runs entirely
                in your browser. No face data is sent to Google.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200">Supabase</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Leaderboard data is stored in Supabase. Their privacy policy
                applies to data storage:{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  supabase.com/privacy
                </a>
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-200">GitHub Pages</h3>
              <p className="mt-1 text-sm text-zinc-400">
                This site is hosted on GitHub Pages. Standard web server logs
                may be collected. See{" "}
                <a
                  href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  GitHub&apos;s Privacy Statement
                </a>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Your Rights
          </h2>
          <p className="leading-relaxed text-zinc-400">
            Since we only store anonymous leaderboard data (nicknames and
            scores), there is no personal data to request or delete. If you have
            concerns about a specific leaderboard entry, please contact us.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--accent)]">
            Contact
          </h2>
          <p className="leading-relaxed text-zinc-400">
            For privacy concerns or questions, please open an issue on our{" "}
            <a
              href="https://github.com/sanderdesnaijer/eyebrow-tetris"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>

        <section className="border-t border-zinc-800 pt-6">
          <p className="text-sm text-zinc-500">Last updated: March 2026</p>
        </section>
      </div>
    </div>
  );
}
