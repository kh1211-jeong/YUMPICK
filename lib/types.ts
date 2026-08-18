export type UserRow = {
  id: string;
  name: string;
  birthdate: string;
  phone: string;
  email: string | null;
  nickname: string | null;
  created_at: string;
};

export type GroupType = "couple" | "team" | "friends" | string;

export type GroupRow = {
  id: string;
  name: string;
  type: GroupType;
  owner_id: string;
  invite_token: string;
  created_at: string;
};

export type GroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  is_favorite: boolean;
};

export type SessionStatus = "collecting" | "voting" | "closed";

export type Candidate = {
  name: string;
  category: string;
  rating: number;
  url: string;
  address: string;
  lat: number;
  lng: number;
};

export type SessionRow = {
  id: string;
  group_id: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  status: SessionStatus;
  candidates: Candidate[] | null;
  winner_restaurant: string | null;
  created_at: string;
};

export type ParsedPreference = {
  like: string[];
  avoid: string[];
  budget: string | null;
  mood: string | null;
};

export type PreferenceRow = {
  id: string;
  session_id: string;
  user_id: string;
  raw_text: string;
  parsed: ParsedPreference | null;
  passed: boolean;
  created_at: string;
};

export type VoteRow = {
  id: string;
  session_id: string;
  user_id: string;
  restaurant: string;
  created_at: string;
};
