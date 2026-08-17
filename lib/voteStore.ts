import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { VoteRow } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mock-votes.json");

async function readMockVotes(): Promise<VoteRow[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as VoteRow[];
  } catch {
    return [];
  }
}

async function writeMockVotes(votes: VoteRow[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(votes, null, 2), "utf-8");
}

export async function castVote(
  sessionId: string,
  userId: string,
  restaurant: string
): Promise<VoteRow> {
  if (isSupabaseConfigured) {
    const { data: existing } = await supabase!
      .from("votes")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();

    const row = {
      id: (existing as { id: string } | null)?.id ?? randomUUID(),
      session_id: sessionId,
      user_id: userId,
      restaurant,
    };
    const { data, error } = await supabase!
      .from("votes")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data as VoteRow;
  }

  const votes = await readMockVotes();
  const idx = votes.findIndex((v) => v.session_id === sessionId && v.user_id === userId);
  const row: VoteRow = {
    id: idx >= 0 ? votes[idx].id : randomUUID(),
    session_id: sessionId,
    user_id: userId,
    restaurant,
    created_at: idx >= 0 ? votes[idx].created_at : new Date().toISOString(),
  };
  if (idx >= 0) votes[idx] = row;
  else votes.push(row);
  await writeMockVotes(votes);
  return row;
}

export async function getVotes(sessionId: string): Promise<VoteRow[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!.from("votes").select("*").eq("session_id", sessionId);
    return (data as VoteRow[]) ?? [];
  }
  const votes = await readMockVotes();
  return votes.filter((v) => v.session_id === sessionId);
}
