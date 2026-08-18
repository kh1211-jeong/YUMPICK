const PREFIX = "yumpick:";

function isBrowser() {
  return typeof window !== "undefined";
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function readTable<T>(table: string): T[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(PREFIX + table);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

export function writeTable<T>(table: string, rows: T[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PREFIX + table, JSON.stringify(rows));
}

export function upsertRow<T extends { id: string }>(table: string, row: T): T {
  const rows = readTable<T>(table);
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  writeTable(table, rows);
  return row;
}

const CURRENT_USER_KEY = PREFIX + "current_user";

export function readCurrentUserId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(CURRENT_USER_KEY);
}

export function writeCurrentUserId(userId: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
}

export function clearCurrentUserId(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CURRENT_USER_KEY);
}
