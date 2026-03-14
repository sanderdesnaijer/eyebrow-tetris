"use client";

import { useEffect, useState } from "react";
import { fetchLeaderboard, type LeaderboardEntry, type InputMode } from "@/lib/supabase";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"score" | "level" | "lines">(
    "score"
  );
  const [inputModeFilter, setInputModeFilter] = useState<InputMode | 'all'>('eyebrow');

  useEffect(() => {
    let cancelled = false;
    const mode = inputModeFilter === 'all' ? undefined : inputModeFilter;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetchLeaderboard(mode, 100).then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [inputModeFilter]);

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
      <h1 className="pixel-font mb-6 text-center text-2xl text-[var(--blue)]">
        LEADERBOARD
      </h1>

      {/* Input Mode Tabs */}
      <div className="mb-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setInputModeFilter('eyebrow')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            inputModeFilter === 'eyebrow'
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          👁️ Eyebrow
        </button>
        <button
          type="button"
          onClick={() => setInputModeFilter('keyboard')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            inputModeFilter === 'keyboard'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          ⌨️ Keyboard
        </button>
        <button
          type="button"
          onClick={() => setInputModeFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            inputModeFilter === 'all'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          All
        </button>
      </div>

      <noscript>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <p className="text-zinc-400">
            The Eyebrow Tetris leaderboard shows the top scores from players
            around the world. Rankings are available for both eyebrow (face
            control) mode and keyboard mode. Enable JavaScript to view live
            scores.
          </p>
        </div>
      </noscript>

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
                  {inputModeFilter === 'all' && (
                    <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">
                      Mode
                    </th>
                  )}
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
                    {inputModeFilter === 'all' && (
                      <td className="px-4 py-3 text-center">
                        {entry.input_mode === 'eyebrow' ? (
                          <span className="text-green-400" title="Eyebrow mode">👁️</span>
                        ) : (
                          <span className="text-amber-400" title="Keyboard mode">⌨️</span>
                        )}
                      </td>
                    )}
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
