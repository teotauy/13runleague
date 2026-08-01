import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const game = {
  game_pk: "823224",
  game_date: "2026-05-09",
  home_team: "SF",
  away_team: "PIT",
  home_score: 3,
  away_score: 13,
  was_thirteen: true,
  winning_team: "PIT",
  final: true,
};

const { data, error } = await supabase
  .from("game_results")
  .upsert([game], { onConflict: "game_pk" })
  .select();

if (error) {
  console.error("Error inserting game:", error);
  process.exit(1);
} else {
  console.log("✅ Game inserted successfully:", JSON.stringify(data, null, 2));
}
