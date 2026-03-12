"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/supabase";

export default function LeaderboardPage() {
  // Note: metadata is defined in a separate file for client components
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"score" | "level" | "lines">(
    "score"
  );

  useEffect(() => {
    fetchLeaderboard(100).then((data) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const sortedEntries = [...entries].sort((a, b) => b[sortField] - a[sortField]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="pixel-font mb-8 text-center text-2xl text-[var(--blue)]">
        LEADERBOARD
      </h1>

      {loading ? (
        <div className="py-12 text-center text-zinc-400">
          Loading leaderboard...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-12 text-center">
          <p className="text-zinc-400">No scores yet. Be the first to play!</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-end gap-2">
            <span className="text-sm text-zinc-500">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) =>
                setSortField(e.target.value as "score" | "level" | "lines")
              }
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="score">Score</option>
              <option value="level">Level</option>
              <option value="lines">Lines</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">
                    Player
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                    Score
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                    Level
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">
                    Lines
                  </th>
                  <th className="hidden px-4 py-3 text-right text-sm font-medium text-zinc-400 sm:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry, index) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-zinc-800/50 ${
                      index < 3 ? "bg-zinc-900/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      {index === 0 ? (
                        <span className="text-lg">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-lg">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-lg">🥉</span>
                      ) : (
                        <span className="text-zinc-500">{index + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">
                      {entry.nickname}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          sortField === "score"
                            ? "font-bold text-[var(--accent)]"
                            : "text-zinc-300"
                        }
                      >
                        {entry.score.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          sortField === "level"
                            ? "font-bold text-[var(--accent)]"
                            : "text-zinc-400"
                        }
                      >
                        {entry.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          sortField === "lines"
                            ? "font-bold text-[var(--accent)]"
                            : "text-zinc-400"
                        }
                      >
                        {entry.lines}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-sm text-zinc-500 sm:table-cell">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
