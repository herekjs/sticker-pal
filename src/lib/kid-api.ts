import { getSupabase } from "./supabase";
import { DEFAULT_TIERS, type KidView, type Role } from "./types";

export interface KidApi {
  view(): Promise<KidView>;
  toggle(routineId: string, done: boolean): Promise<KidView>;
  pickTheme(themeId: string): Promise<KidView>;
  /** 중간 단계에서 STOP(선물 받기) / GO(더 모으기) */
  choose(choice: "stop" | "go"): Promise<KidView>;
  /** 데모 모드에서만 존재: 부모 승인을 흉내냄 */
  demoApprove?(role: Role): Promise<KidView>;
  demoBonus?(role: Role): Promise<KidView>;
  demoGive?(note: string): Promise<KidView>;
}

export const DEMO_TOKEN = "demo";

export function kidApi(token: string): KidApi {
  return token === DEMO_TOKEN ? demoApi() : realApi(token);
}

function realApi(token: string): KidApi {
  const call = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await getSupabase().rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as KidView;
  };
  return {
    view: () => call("kid_view", { p_token: token }),
    toggle: (routineId, done) =>
      call("kid_toggle", { p_token: token, p_routine: routineId, p_done: done }),
    pickTheme: (themeId) => call("kid_pick_theme", { p_token: token, p_theme: themeId }),
    choose: (choice) => call("kid_choose", { p_token: token, p_choice: choice }),
  };
}

// ───────── 데모 모드 (Supabase 없이 화면/애니메이션 확인용) ─────────
const DEMO_KEY = "sticker-demo-state";

const DEMO_THEMES = [
  { id: "dino", name: "공룡", emoji: "🦖", color: "#86efac" },
  { id: "space", name: "우주", emoji: "🚀", color: "#a5b4fc" },
  { id: "animals", name: "동물친구", emoji: "🐱", color: "#fcd34d" },
  { id: "dessert", name: "디저트", emoji: "🧁", color: "#f9a8d4" },
  { id: "car", name: "자동차", emoji: "🚗", color: "#fca5a5" },
  { id: "unicorn", name: "유니콘", emoji: "🦄", color: "#d8b4fe" },
];

function freshDemo(): KidView {
  return {
    kid: { name: "하늘이", avatar: "🐻" },
    today: new Date().toISOString().slice(0, 10),
    routines: [
      { id: "r1", title: "양치하기", icon: "🪥", done: false },
      { id: "r2", title: "책 읽기", icon: "📚", done: false },
      { id: "r3", title: "장난감 정리", icon: "🧸", done: false },
    ],
    submission: null,
    waiting_days: 0,
    board: null,
    stickers: [],
    coupons: [],
    themes: DEMO_THEMES,
  };
}

function closeBoard(v: KidView, count: number) {
  const tier = v.board?.tiers.find((t) => t.count === count);
  v.coupons.unshift({
    id: "c" + Date.now(),
    title: tier ? `${tier.name} (${count}개)` : "선물",
    issued_at: new Date().toISOString(),
    used_at: null,
    tier_name: tier?.name ?? null,
    tier_count: count,
    gift_note: null,
  });
  v.board = null;
  v.stickers = [];
}

/** 스티커가 붙은 직후: 마지막 단계면 쿠폰, 중간 단계면 STOP/GO 선택 대기 */
function finishSticker(v: KidView) {
  if (!v.board) return;
  const n = v.stickers.length;
  if (n >= v.board.size) closeBoard(v, n);
  else if (v.board.tiers.some((t) => t.count === n)) v.board.choice_at = n;
}

function demoApi(): KidApi {
  const load = (): KidView => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const v = JSON.parse(raw) as KidView;
        if (v.board && !v.board.tiers) {
          v.board.tiers = DEFAULT_TIERS;
          v.board.choice_at = null;
        }
        return v;
      }
    } catch {}
    return freshDemo();
  };
  const save = (v: KidView) => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(v));
    } catch {}
    return structuredClone(v);
  };

  return {
    async view() {
      return save(load());
    },
    async toggle(routineId, done) {
      const v = load();
      if (v.submission && ["pending", "approved"].includes(v.submission.status)) return save(v);
      v.routines = v.routines.map((r) => (r.id === routineId ? { ...r, done } : r));
      if (v.routines.length && v.routines.every((r) => r.done)) {
        v.submission = { status: "pending", reject_note: null };
        v.waiting_days = 1;
      }
      return save(v);
    },
    async pickTheme(themeId) {
      const v = load();
      if (v.board && v.stickers.length) return save(v);
      v.board = {
        id: "b" + Date.now(),
        theme_id: themeId,
        size: DEFAULT_TIERS[DEFAULT_TIERS.length - 1].count,
        tiers: DEFAULT_TIERS,
        choice_at: null,
      };
      return save(v);
    },
    async choose(choice) {
      const v = load();
      if (!v.board || v.board.choice_at == null) return save(v);
      if (choice === "go") v.board.choice_at = null;
      else closeBoard(v, v.board.choice_at);
      return save(v);
    },
    async demoGive(note) {
      const v = load();
      const c = v.coupons.find((x) => !x.used_at);
      if (c) {
        c.used_at = new Date().toISOString();
        c.gift_note = note;
      }
      return save(v);
    },
    async demoApprove(role) {
      const v = load();
      if (!v.board || v.board.choice_at != null || v.submission?.status !== "pending") return save(v);
      const slot = v.stickers.length + 1;
      v.stickers.push({ slot_no: slot, date: v.today, role, kind: "routine", note: null });
      v.submission = { status: "approved", reject_note: null };
      v.waiting_days = 0;
      finishSticker(v);
      return save(v);
    },
    async demoBonus(role) {
      const v = load();
      if (!v.board || v.board.choice_at != null) return save(v);
      v.stickers.push({
        slot_no: v.stickers.length + 1,
        date: v.today,
        role,
        kind: "bonus",
        note: "동생 잘 돌봐줬어!",
      });
      finishSticker(v);
      return save(v);
    },
  };
}

/** 데모에서 "내일 하기": 오늘 상태 초기화 */
export function demoNextDay() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return;
    const v = JSON.parse(raw) as KidView;
    v.submission = null;
    v.routines = v.routines.map((r) => ({ ...r, done: false }));
    localStorage.setItem(DEMO_KEY, JSON.stringify(v));
  } catch {}
}

/** 데모: 다음 선물 단계 직전까지 스티커를 채움 */
export function demoFastForward() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    const v = raw ? (JSON.parse(raw) as KidView) : freshDemo();
    if (!v.board) {
      v.board = {
        id: "b" + Date.now(),
        theme_id: "dino",
        size: DEFAULT_TIERS[DEFAULT_TIERS.length - 1].count,
        tiers: DEFAULT_TIERS,
        choice_at: null,
      };
    }
    if (v.board.choice_at != null) return;
    const next = v.board.tiers.find((t) => t.count > v.stickers.length)?.count ?? v.board.size;
    const roles: Role[] = ["mom", "dad"];
    for (let i = v.stickers.length; i < next - 1; i++) {
      const slot = i + 1;
      v.stickers.push({
        slot_no: slot,
        date: `2026-01-${String(slot).padStart(2, "0")}`,
        role: roles[i % 2],
        kind: "routine",
        note: null,
      });
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(v));
  } catch {}
}
