export type Role = "mom" | "dad";

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface KidRoutine {
  id: string;
  title: string;
  icon: string;
  done: boolean;
}

export type SubmissionStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface KidView {
  kid: { name: string; avatar: string };
  today: string;
  routines: KidRoutine[];
  submission: { status: SubmissionStatus; reject_note: string | null } | null;
  waiting_days: number;
  board: { id: string; theme_id: string; size: number } | null;
  stickers: { slot_no: number; date: string; role: Role | null }[];
  coupons: { id: string; title: string; issued_at: string; used_at: string | null }[];
  themes: Theme[];
}

export const ROLE_LABEL: Record<Role, string> = { mom: "엄마", dad: "아빠" };
export const ROLE_EMOJI: Record<Role, string> = { mom: "👩", dad: "👨" };
