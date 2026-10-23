import { getSupabase } from "./supabase";
import type { KidView, Role } from "./types";

export interface KidApi {
  view(): Promise<KidView>;
  toggle(routineId: string, done: boolean): Promise<KidView>;
  pickTheme(themeId: string): Promise<KidView>;
  /** 데모 모드에서만 존재: 부모 승인을 흉내냄 */
  demoApprove?(role: Role): Promise<KidView>;
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

function demoApi(): KidApi {
  const load = (): KidView => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw) as KidView;
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
      v.board = { id: "b" + Date.now(), theme_id: themeId, size: 30 };
      return save(v);
    },
    async demoApprove(role) {
      const v = load();
      if (!v.board || v.submission?.status !== "pending") return save(v);
      const slot = v.stickers.length + 1;
      v.stickers.push({ slot_no: slot, date: v.today, role });
      v.submission = { status: "approved", reject_note: null };
      v.waiting_days = 0;
      if (slot >= v.board.size) {
        v.coupons.unshift({ id: "c" + Date.now(), title: "장난감 1개", issued_at: new Date().toISOString(), used_at: null });
        v.board = null;
        v.stickers = [];
      }
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

export function demoFastForward(n: number) {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    const v = raw ? (JSON.parse(raw) as KidView) : freshDemo();
    if (!v.board) v.board = { id: "b" + Date.now(), theme_id: "dino", size: 30 };
    const roles: Role[] = ["mom", "dad"];
    for (let i = 0; i < n && v.stickers.length < v.board.size - 1; i++) {
      const slot = v.stickers.length + 1;
      v.stickers.push({ slot_no: slot, date: `2026-01-${String(slot).padStart(2, "0")}`, role: roles[i % 2] });
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(v));
  } catch {}
}
