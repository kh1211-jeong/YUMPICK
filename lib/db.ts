import { supabase, isSupabaseConfigured } from "./supabase";
import { readTable, upsertRow, uuid, readCurrentUserId, writeCurrentUserId, clearCurrentUserId } from "./mockStore";
import type {
  UserRow,
  GroupRow,
  GroupMemberRow,
  SessionRow,
  SessionStatus,
  PreferenceRow,
  ParsedPreference,
  Candidate,
  LocationPolicy,
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function inviteToken() {
  return uuid().replace(/-/g, "").slice(0, 10);
}

// ---------- users ----------

export async function findUserByIdentity(
  name: string,
  birthdate: string,
  phone: string
): Promise<UserRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("users")
      .select("*")
      .eq("name", name)
      .eq("birthdate", birthdate)
      .eq("phone", phone)
      .maybeSingle();
    return (data as UserRow) ?? null;
  }
  const users = readTable<UserRow>("users");
  return (
    users.find(
      (u) => u.name === name && u.birthdate === birthdate && u.phone === phone
    ) ?? null
  );
}

export async function getUserById(id: string): Promise<UserRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!.from("users").select("*").eq("id", id).maybeSingle();
    return (data as UserRow) ?? null;
  }
  const users = readTable<UserRow>("users");
  return users.find((u) => u.id === id) ?? null;
}

export async function findUserByNickname(nickname: string): Promise<UserRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("users")
      .select("*")
      .eq("nickname", nickname)
      .maybeSingle();
    return (data as UserRow) ?? null;
  }
  const users = readTable<UserRow>("users");
  return users.find((u) => u.nickname === nickname) ?? null;
}

export async function createUser(input: {
  name: string;
  birthdate: string;
  phone: string;
  nickname: string;
  email?: string | null;
}): Promise<UserRow> {
  const existing = await findUserByIdentity(input.name, input.birthdate, input.phone);
  if (existing) return existing;

  const nicknameTaken = await findUserByNickname(input.nickname);
  if (nicknameTaken) throw new Error("NICKNAME_TAKEN");

  const row: UserRow = {
    id: uuid(),
    name: input.name,
    birthdate: input.birthdate,
    phone: input.phone,
    email: input.email ?? null,
    nickname: input.nickname,
    created_at: nowIso(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase!.from("users").insert(row).select().single();
    if (error) throw error;
    return data as UserRow;
  }
  return upsertRow("users", row);
}

export function getCurrentUserId(): string | null {
  return readCurrentUserId();
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const id = readCurrentUserId();
  if (!id) return null;
  return getUserById(id);
}

export function setCurrentUser(user: UserRow): void {
  writeCurrentUserId(user.id);
}

export function logout(): void {
  clearCurrentUserId();
}

// ---------- groups ----------

export async function createGroup(input: {
  name: string;
  type: string;
  ownerId: string;
}): Promise<GroupRow> {
  const row: GroupRow = {
    id: uuid(),
    name: input.name,
    type: input.type,
    owner_id: input.ownerId,
    invite_token: inviteToken(),
    location_policy: "anyone",
    created_at: nowIso(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase!.from("groups").insert(row).select().single();
    if (error) throw error;
    await joinGroup((data as GroupRow).id, input.ownerId);
    return data as GroupRow;
  }
  upsertRow("groups", row);
  await joinGroup(row.id, input.ownerId);
  return row;
}

export async function setGroupLocationPolicy(
  groupId: string,
  policy: LocationPolicy
): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase!
      .from("groups")
      .update({ location_policy: policy })
      .eq("id", groupId);
    if (error) throw error;
    return;
  }
  const group = readTable<GroupRow>("groups").find((g) => g.id === groupId);
  if (group) upsertRow("groups", { ...group, location_policy: policy });
}

export async function getGroup(id: string): Promise<GroupRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!.from("groups").select("*").eq("id", id).maybeSingle();
    return (data as GroupRow) ?? null;
  }
  const groups = readTable<GroupRow>("groups");
  return groups.find((g) => g.id === id) ?? null;
}

export async function getGroupByInviteToken(token: string): Promise<GroupRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("groups")
      .select("*")
      .eq("invite_token", token)
      .maybeSingle();
    return (data as GroupRow) ?? null;
  }
  const groups = readTable<GroupRow>("groups");
  return groups.find((g) => g.invite_token === token) ?? null;
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const already = await isGroupMember(groupId, userId);
  if (already) return;

  const row: GroupMemberRow = {
    id: uuid(),
    group_id: groupId,
    user_id: userId,
    joined_at: nowIso(),
    is_favorite: false,
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase!.from("group_members").insert(row);
    if (error) throw error;
    return;
  }
  upsertRow("group_members", row);
}

export async function getUserGroupsDetailed(
  userId: string
): Promise<(GroupRow & { is_favorite: boolean })[]> {
  if (isSupabaseConfigured) {
    const { data: memberships } = await supabase!
      .from("group_members")
      .select("group_id, is_favorite")
      .eq("user_id", userId);
    const rows = (memberships ?? []) as { group_id: string; is_favorite: boolean }[];
    if (rows.length === 0) return [];
    const { data } = await supabase!
      .from("groups")
      .select("*")
      .in("id", rows.map((m) => m.group_id));
    const groups = (data as GroupRow[]) ?? [];
    return groups.map((g) => ({
      ...g,
      is_favorite: rows.find((m) => m.group_id === g.id)?.is_favorite ?? false,
    }));
  }
  const memberships = readTable<GroupMemberRow>("group_members").filter(
    (m) => m.user_id === userId
  );
  const groups = readTable<GroupRow>("groups");
  return groups
    .filter((g) => memberships.some((m) => m.group_id === g.id))
    .map((g) => ({
      ...g,
      is_favorite: memberships.find((m) => m.group_id === g.id)?.is_favorite ?? false,
    }));
}

export async function setGroupFavorite(
  groupId: string,
  userId: string,
  isFavorite: boolean
): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase!
      .from("group_members")
      .update({ is_favorite: isFavorite })
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const memberships = readTable<GroupMemberRow>("group_members");
  const row = memberships.find((m) => m.group_id === groupId && m.user_id === userId);
  if (row) upsertRow("group_members", { ...row, is_favorite: isFavorite });
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  }
  const memberships = readTable<GroupMemberRow>("group_members");
  return memberships.some((m) => m.group_id === groupId && m.user_id === userId);
}

export async function getGroupMembers(groupId: string): Promise<UserRow[]> {
  if (isSupabaseConfigured) {
    const { data: memberships } = await supabase!
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);
    const userIds = (memberships ?? []).map((m: { user_id: string }) => m.user_id);
    if (userIds.length === 0) return [];
    const { data } = await supabase!.from("users").select("*").in("id", userIds);
    return (data as UserRow[]) ?? [];
  }
  const memberships = readTable<GroupMemberRow>("group_members").filter(
    (m) => m.group_id === groupId
  );
  const users = readTable<UserRow>("users");
  return users.filter((u) => memberships.some((m) => m.user_id === u.id));
}

// ---------- sessions ----------

export async function createSession(
  groupId: string,
  centerLat: number,
  centerLng: number
): Promise<SessionRow> {
  const row: SessionRow = {
    id: uuid(),
    group_id: groupId,
    center_lat: centerLat,
    center_lng: centerLng,
    radius_m: 3000,
    status: "collecting",
    candidates: null,
    winner_restaurant: null,
    created_at: nowIso(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase!.from("sessions").insert(row).select().single();
    if (error) throw error;
    return data as SessionRow;
  }
  return upsertRow("sessions", row);
}

export async function getSession(id: string): Promise<SessionRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!.from("sessions").select("*").eq("id", id).maybeSingle();
    return (data as SessionRow) ?? null;
  }
  const sessions = readTable<SessionRow>("sessions");
  return sessions.find((s) => s.id === id) ?? null;
}

// Only valid while still collecting preferences -- once candidates exist the
// list was generated for the old center point, so changing it afterward
// would silently desync the shown restaurants from the actual search origin.
export async function updateSessionLocation(
  sessionId: string,
  centerLat: number,
  centerLng: number
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "collecting") return;

  if (isSupabaseConfigured) {
    const { error } = await supabase!
      .from("sessions")
      .update({ center_lat: centerLat, center_lng: centerLng })
      .eq("id", sessionId);
    if (error) throw error;
    return;
  }
  upsertRow("sessions", { ...session, center_lat: centerLat, center_lng: centerLng });
}

// A group has at most one "오늘 식사" session in flight at a time -- everyone
// who clicks "오늘 식사 시작" should join that one instead of forking a new
// session that nobody else's preferences/votes ever reach.
export async function getActiveSessionForGroup(groupId: string): Promise<SessionRow | null> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("sessions")
      .select("*")
      .eq("group_id", groupId)
      .in("status", ["collecting", "voting"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as SessionRow) ?? null;
  }
  const sessions = readTable<SessionRow>("sessions")
    .filter((s) => s.group_id === groupId && (s.status === "collecting" || s.status === "voting"))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return sessions[0] ?? null;
}

export async function setSessionCandidates(
  sessionId: string,
  candidates: Candidate[]
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;
  const updated: SessionRow = { ...session, candidates, status: "voting" };

  if (isSupabaseConfigured) {
    const { error } = await supabase!
      .from("sessions")
      .update({ candidates, status: "voting" })
      .eq("id", sessionId);
    if (error) throw error;
    return;
  }
  upsertRow("sessions", updated);
}

export async function setSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  if (isSupabaseConfigured) {
    const { error } = await supabase!.from("sessions").update({ status }).eq("id", sessionId);
    if (error) throw error;
    return;
  }
  upsertRow("sessions", { ...session, status });
}

// Persists the final pick so every viewer (including anyone loading the
// result page after a random tie-break) sees the same restaurant.
export async function closeSessionWithWinner(
  sessionId: string,
  winnerRestaurant: string
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  if (isSupabaseConfigured) {
    const { error } = await supabase!
      .from("sessions")
      .update({ status: "closed", winner_restaurant: winnerRestaurant })
      .eq("id", sessionId);
    if (error) throw error;
    return;
  }
  upsertRow("sessions", { ...session, status: "closed", winner_restaurant: winnerRestaurant });
}

export type MealHistoryEntry = { restaurant: string; created_at: string };

// Every closed session (across all of the user's groups) that ended in a
// confirmed restaurant -- powers "최근 선택한 식당" / "자주 가는 식당" on 내 정보.
export async function getUserMealHistory(userId: string): Promise<MealHistoryEntry[]> {
  if (isSupabaseConfigured) {
    const { data: memberships } = await supabase!
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
    if (groupIds.length === 0) return [];
    const { data } = await supabase!
      .from("sessions")
      .select("winner_restaurant, created_at")
      .in("group_id", groupIds)
      .eq("status", "closed")
      .not("winner_restaurant", "is", null)
      .order("created_at", { ascending: false });
    return ((data ?? []) as { winner_restaurant: string; created_at: string }[]).map((s) => ({
      restaurant: s.winner_restaurant,
      created_at: s.created_at,
    }));
  }

  const groupIds = readTable<GroupMemberRow>("group_members")
    .filter((m) => m.user_id === userId)
    .map((m) => m.group_id);
  return readTable<SessionRow>("sessions")
    .filter((s) => groupIds.includes(s.group_id) && s.status === "closed" && s.winner_restaurant)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((s) => ({ restaurant: s.winner_restaurant as string, created_at: s.created_at }));
}

// ---------- preferences ----------

export async function submitPreference(input: {
  sessionId: string;
  userId: string;
  rawText: string;
  passed: boolean;
  parsed: ParsedPreference | null;
}): Promise<PreferenceRow> {
  const existing = (await getPreferences(input.sessionId)).find(
    (p) => p.user_id === input.userId
  );

  const row: PreferenceRow = {
    id: existing?.id ?? uuid(),
    session_id: input.sessionId,
    user_id: input.userId,
    raw_text: input.rawText,
    parsed: input.parsed,
    passed: input.passed,
    created_at: existing?.created_at ?? nowIso(),
  };

  if (isSupabaseConfigured) {
    const { data, error } = await supabase!
      .from("preferences")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    return data as PreferenceRow;
  }
  return upsertRow("preferences", row);
}

export async function getPreferences(sessionId: string): Promise<PreferenceRow[]> {
  if (isSupabaseConfigured) {
    const { data } = await supabase!
      .from("preferences")
      .select("*")
      .eq("session_id", sessionId);
    return (data as PreferenceRow[]) ?? [];
  }
  return readTable<PreferenceRow>("preferences").filter((p) => p.session_id === sessionId);
}

// Votes are handled server-side via app/api/vote/route.ts (see lib/voteStore.ts),
// not through this client-side db module.
