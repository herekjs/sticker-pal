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

export interface RewardTier {
  count: number;
  name: string;
}

export interface KidView {
  kid: { name: string; avatar: string };
  today: string;
  routines: KidRoutine[];
  submission: { status: SubmissionStatus; reject_note: string | null } | null;
  waiting_days: number;
  board: {
    id: string;
    theme_id: string;
    size: number;
    tiers: RewardTier[];
    /** null이 아니면 그 개수에서 STOP/GO 선택 대기 중 */
    choice_at: number | null;
  } | null;
  stickers: {
    slot_no: number;
    date: string;
    role: Role | null;
    kind: "routine" | "bonus";
    note: string | null;
  }[];
  coupons: {
    id: string;
    title: string;
    issued_at: string;
    used_at: string | null;
    tier_name: string | null;
    tier_count: number | null;
    gift_note: string | null;
  }[];
  themes: Theme[];
}

export const DEFAULT_TIERS: RewardTier[] = [
  { count: 10, name: "작은 선물" },
  { count: 20, name: "중간 선물" },
  { count: 30, name: "큰 선물" },
];

export const ROLE_LABEL: Record<Role, string> = { mom: "엄마", dad: "아빠" };
export const ROLE_EMOJI: Record<Role, string> = { mom: "👩", dad: "👨" };
