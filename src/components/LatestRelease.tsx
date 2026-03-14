"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Release {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

const GITHUB_OWNER =
  process.env.NEXT_PUBLIC_GITHUB_OWNER || "sanderdesnaijer";
const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || "eyebrow-tetris";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LatestRelease() {
  const [release, setRelease] = useState<Release | null>(null);

  useEffect(() => {
    fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRelease(data);
      })
      .catch(() => {});
  }, []);

  if (!release) return null;

  return (
    <Link
      href="/changelog"
      className="neon-card group flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors"
    >
      <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
        {release.tag_name}
      </span>
      <span className="text-zinc-400">
        {release.name || `Release ${release.tag_name}`}
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">{formatDate(release.published_at)}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
