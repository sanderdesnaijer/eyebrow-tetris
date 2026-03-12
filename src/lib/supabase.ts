import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials not configured. Leaderboard features will be disabled."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export type InputMode = 'eyebrow' | 'keyboard';

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  level: number;
  lines: number;
  input_mode: InputMode;
  created_at: string;
}

export async function submitScore(
  nickname: string,
  score: number,
  level: number,
  lines: number,
  inputMode: InputMode
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Leaderboard not configured" };
  }

  const { error } = await supabase.from("leaderboard").insert({
    nickname,
    score,
    level,
    lines,
    input_mode: inputMode,
  });

  if (error) {
    console.error("Failed to submit score:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

const LEADERBOARD_SIZE = 100;

export async function fetchLeaderboard(
  inputMode?: InputMode,
  limit = LEADERBOARD_SIZE
): Promise<LeaderboardEntry[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("leaderboard")
    .select("*")
    .order("score", { ascending: false })
    .limit(limit);

  if (inputMode) {
    query = query.eq("input_mode", inputMode);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }

  return data || [];
}

export async function checkScoreQualifies(
  score: number,
  inputMode: InputMode
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const leaderboard = await fetchLeaderboard(inputMode, LEADERBOARD_SIZE);
  
  if (leaderboard.length < LEADERBOARD_SIZE) {
    return true;
  }
  
  const lowestScore = leaderboard[leaderboard.length - 1].score;
  return score > lowestScore;
}
