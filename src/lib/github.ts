export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

const GITHUB_OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || "sanderdesnaijer";
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "eyebrow-tetris";

export async function fetchReleases(): Promise<GitHubRelease[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      console.error("Failed to fetch releases:", res.status);
      return [];
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching releases:", error);
    return [];
  }
}
