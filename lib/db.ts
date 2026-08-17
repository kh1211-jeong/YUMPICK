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

export async function createUser(input: {
  name: string;
  birthdate: string;
  phone: string;
  email?: string | null;
}): Promise<UserRow> {
  const existing = await findUserByIdentity(input.name, input.birthdate, input.phone);
  if (existing) return existing;

  const row: UserRow = {
    id: uuid(),
    name: input.name,
    birthdate: input.birthdate,
    phone: input.phone,
    email: input.email ?? null,
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

export async function getUserGroups(userId: string): Promise<GroupRow[]> {
  if (isSupabaseConfigured) {
    const { data: memberships } = await supabase!
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);
    const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id);
    if (groupIds.length === 0) return [];
    const { data } = await supabase!.from("groups").select("*").in("id", groupIds);
    return (data as GroupRow[]) ?? [];
  }
  const memberships = readTable<GroupMemberRow>("group_members").filter(
    (m) => m.user_id === userId
  );
  const groups = readTable<GroupRow>("groups");
  return groups.filter((g) => memberships.some((m) => m.group_id === g.id));
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const already = await isGroupMember(groupId, userId);
  if (already) return;

  const row: GroupMemberRow = {
    id: uuid(),
    group_id: groupId,
    user_id: userId,
    joined_at: nowIso(),
  };

  if (isSupabaseConfigured) {
    const { error } = await supabase!.from("group_members").insert(row);
    if (error) throw error;
    return;
  }
  upsertRow("group_members", row);
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
