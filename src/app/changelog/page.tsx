import type { Metadata } from "next";
import { fetchReleases } from "@/lib/github";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";

export const metadata: Metadata = {
  title: "Changelog - Updates & Release Notes",
  description:
    "Eyebrow Tetris changelog — version history, new features, and release notes. See what's new in the face-controlled Tetris game.",
  alternates: {
    canonical: "/changelog",
  },
  keywords: [
    "eyebrow tetris changelog",
    "eyebrow tetris updates",
    "face tetris version history",
    "eyebrow tetris release notes",
  ],
  openGraph: {
    title: "Changelog - Eyebrow Tetris Updates & Release Notes",
    description:
      "Version history and release notes for Eyebrow Tetris. See what's new in the face-controlled Tetris game.",
    url: `${SITE_URL}/changelog`,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eyebrow Tetris Changelog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog - Eyebrow Tetris Updates",
    description:
      "Version history and release notes for Eyebrow Tetris. See what's new in the face-controlled Tetris game.",
    images: ["/og-image.png"],
  },
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseMarkdown(text: string): string {
  if (!text) return "";

  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] hover:underline">$1</a>')
    .replace(/^### (.+)$/gm, '<h4 class="mt-4 mb-2 font-semibold text-zinc-200">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="mt-4 mb-2 font-semibold text-zinc-100">$1</h3>')
    .replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-zinc-800 px-1 py-0.5 text-sm text-[var(--accent)]">$1</code>')
    .replace(/\n\n/g, "</p><p class='mt-3'>")
    .replace(/<\/li>\n<li/g, "</li><li")
    .replace(/(?<=^|[^"=])https?:\/\/[^\s<)]+/g, '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] hover:underline break-all">$&</a>');
}

export default async function ChangelogPage() {
  const releases = await fetchReleases();

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Changelog", path: "/changelog" }]} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="neon-text-cyan pixel-font mb-8 text-center text-2xl text-[var(--blue)]">
          CHANGELOG
        </h1>

      {releases.length === 0 ? (
        <div className="neon-card rounded-lg py-12 text-center">
          <p className="text-zinc-400">No releases yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Check back later for version history.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {releases.map((release, index) => (
            <article
              key={release.id}
              className={`neon-card rounded-lg p-6 ${
                index === 0 ? "ring-1 ring-[var(--accent)]/20" : ""
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="pixel-font text-lg text-[var(--accent)]">
                    {release.tag_name}
                  </span>
                  {index === 0 && (
                    <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                      Latest
                    </span>
                  )}
                </div>
                <time className="text-sm text-zinc-500">
                  {formatDate(release.published_at)}
                </time>
              </div>

              {release.name && release.name !== release.tag_name && (
                <h2 className="mb-3 text-lg font-semibold text-white">
                  {release.name}
                </h2>
              )}

              {release.body ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-zinc-400"
                  dangerouslySetInnerHTML={{
                    __html: `<p>${parseMarkdown(release.body)}</p>`,
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-500">No release notes.</p>
              )}

              <div className="mt-4 border-t border-[var(--blue)]/10 pt-4">
                <a
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
                >
                  View on GitHub
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
