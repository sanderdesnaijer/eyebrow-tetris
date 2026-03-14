import type { GameStats } from "./TetrisOverlay";

interface GameStatsDisplayProps {
  stats: GameStats;
  scoreClassName?: string;
  scoreStyle?: React.CSSProperties;
}

export function InputModeLabel({ inputMode }: { inputMode: GameStats["inputMode"] }) {
  const isEyebrow = inputMode === "eyebrow";
  return (
    <p className={`text-sm ${isEyebrow ? "text-green-400" : "text-amber-400"}`}>
      {isEyebrow ? "👁️ Eyebrow" : "⌨️ Keyboard"} mode
    </p>
  );
}

export function GameStatsDisplay({ stats, scoreClassName, scoreStyle }: GameStatsDisplayProps) {
  return (
    <div className="mb-6 space-y-2 text-center">
      <p className={scoreClassName} style={scoreStyle}>
        {stats.score.toLocaleString()}
      </p>
      <p className="text-sm text-zinc-400">
        Level {stats.level} · {stats.lines} lines
      </p>
      <InputModeLabel inputMode={stats.inputMode} />
    </div>
  );
}
