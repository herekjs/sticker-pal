"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DEMO_TOKEN, demoFastForward, demoNextDay, kidApi } from "@/lib/kid-api";
import { popBurst } from "@/lib/confetti";
import type { KidView, Role, SubmissionStatus } from "@/lib/types";
import { StickerBoard } from "./StickerBoard";
import { ThemePicker } from "./ThemePicker";
import { Celebration, type CelebrationInfo } from "./Celebration";
import { CouponTab } from "./CouponTab";
import { ChoiceScreen } from "./ChoiceScreen";

type Tab = "today" | "board" | "coupon";
const TOKEN_KEY = "sticker-kid-token";

export default function KidApp({ token }: { token: string }) {
  const isDemo = token === DEMO_TOKEN;
  const api = useMemo(() => kidApi(token), [token]);
  const [view, setView] = useState<KidView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [celebration, setCelebration] = useState<CelebrationInfo | null>(null);
  const prev = useRef<{ stickers: number; coupons: number } | null>(null);

  const apply = useCallback((v: KidView) => {
    const p = prev.current;
    if (p) {
      const theme = v.themes.find((t) => t.id === v.board?.theme_id);
      if (v.coupons.length > p.coupons) {
        const c = v.coupons[0];
        setCelebration({
          kind: "coupon",
          role: null,
          emoji: "🎟️",
          giftName: c?.tier_name,
          count: c?.tier_count,
        });
        setTab("coupon");
      } else if (v.stickers.length > p.stickers) {
        const last = v.stickers[v.stickers.length - 1];
        setCelebration({
          kind: last?.kind === "bonus" ? "bonus" : "sticker",
          role: last?.role ?? null,
          emoji: theme?.emoji ?? "⭐",
          note: last?.note,
        });
        setTab("board");
      }
    }
    prev.current = { stickers: v.stickers.length, coupons: v.coupons.length };
    setView(v);
    setError(null);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<KidView>) => {
      try {
        apply(await fn());
      } catch (e) {
        setError(e instanceof Error ? e.message : "문제가 생겼어요");
      }
    },
    [apply],
  );

  useEffect(() => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run(api.view);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") run(api.view);
    }, 5000);
    return () => clearInterval(id);
  }, [api, run, token]);

  if (error && !view) {
    return (
      <Shell>
        <div className="mt-24 text-center">
          <div className="text-7xl">🙈</div>
          <p className="mt-4 text-xl">링크가 맞지 않아요.</p>
          <p className="mt-1 text-base text-black/60">엄마·아빠에게 새 링크를 받아요.</p>
        </div>
      </Shell>
    );
  }
  if (!view) {
    return (
      <Shell>
        <motion.div
          className="mt-32 text-center text-7xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          🐻
        </motion.div>
      </Shell>
    );
  }

  const theme = view.themes.find((t) => t.id === view.board?.theme_id);
  const status = view.submission?.status;
  const locked = status === "pending" || status === "approved";
  const doneCount = view.routines.filter((r) => r.done).length;
  const total = view.routines.length;
  const unusedCoupons = view.coupons.filter((c) => !c.used_at).length;
  const choiceAt = view.board?.choice_at ?? null;

  const toggle = (id: string, done: boolean) => {
    if (locked) return;
    if (!done) popBurst(0.5, 0.45);
    run(() => api.toggle(id, !done));
  };

  return (
    <Shell>
      <header className="flex items-center gap-3 pt-2">
        <motion.div
          className="text-6xl"
          animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        >
          {view.kid.avatar}
        </motion.div>
        <div>
          <p className="text-2xl">안녕, {view.kid.name}!</p>
          <p className="text-base text-black/60">
            {tab === "today" ? "오늘도 파이팅! 💪" : tab === "board" ? "내 스티커판" : "내 쿠폰함"}
          </p>
        </div>
      </header>

      <main className="mt-4 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "today" && (
              <TodayTab
                view={view}
                locked={locked}
                doneCount={doneCount}
                total={total}
                onToggle={toggle}
                onPickTheme={(id) => run(() => api.pickTheme(id))}
                demo={
                  isDemo
                    ? {
                        approve: (role) => run(() => api.demoApprove!(role)),
                        bonus: (role) => run(() => api.demoBonus!(role)),
                        nextDay: () => {
                          demoNextDay();
                          run(api.view);
                        },
                        fill: () => {
                          demoFastForward();
                          run(api.view);
                        },
                        give: () => run(() => api.demoGive!("레고 블록 🧱")),
                      }
                    : null
                }
              />
            )}
            {tab === "board" &&
              (view.board && theme ? (
                <StickerBoard view={view} theme={theme} />
              ) : (
                <ThemePicker
                  themes={view.themes}
                  title="다음 스티커판을 골라요!"
                  onPick={(id) => run(() => api.pickTheme(id))}
                />
              ))}
            {tab === "coupon" && <CouponTab view={view} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-around rounded-t-[2rem] bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_24px_rgba(0,0,0,0.12)]">
        {(
          [
            ["today", "🏠", "오늘"],
            ["board", "⭐", "스티커판"],
            ["coupon", "🎟️", "쿠폰"],
          ] as [Tab, string, string][]
        ).map(([id, icon, label]) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.85 }}
            onClick={() => setTab(id)}
            className={`relative flex w-24 flex-col items-center rounded-2xl py-1 text-sm ${
              tab === id ? "bg-amber-100" : ""
            }`}
          >
            <span className="text-3xl">{icon}</span>
            {label}
            {id === "coupon" && unusedCoupons > 0 && (
              <span className="absolute right-3 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs text-white">
                {unusedCoupons}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      <AnimatePresence>
        {choiceAt != null && view.board && (
          <ChoiceScreen
            key="choice"
            count={choiceAt}
            tier={view.board.tiers.find((t) => t.count === choiceAt)}
            next={view.board.tiers.find((t) => t.count > choiceAt)}
            emoji={theme?.emoji ?? "⭐"}
            onChoose={(c) => run(() => api.choose(c))}
          />
        )}
        {celebration && <Celebration info={celebration} onClose={() => setCelebration(null)} />}
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="kid-bg min-h-dvh">
      <div className="mx-auto max-w-md px-4 pb-4">{children}</div>
    </div>
  );
}

interface DemoControls {
  approve: (role: Role) => void;
  bonus: (role: Role) => void;
  nextDay: () => void;
  fill: () => void;
  give: () => void;
}

function TodayTab({
  view,
  locked,
  doneCount,
  total,
  onToggle,
  onPickTheme,
  demo,
}: {
  view: KidView;
  locked: boolean;
  doneCount: number;
  total: number;
  onToggle: (id: string, done: boolean) => void;
  onPickTheme: (id: string) => void;
  demo: DemoControls | null;
}) {
  const status = view.submission?.status;

  if (!view.board) {
    return (
      <ThemePicker
        themes={view.themes}
        title="먼저 스티커판을 골라요!"
        onPick={onPickTheme}
      />
    );
  }

  return (
    <div className="space-y-4">
      {total > 0 && (
        <div className="rounded-3xl bg-white/80 p-3 shadow">
          <div className="mb-1 flex justify-between px-1 text-lg">
            <span>오늘 한 일</span>
            <span>
              {doneCount} / {total}
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-emerald-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-400"
              animate={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
            />
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="rounded-3xl bg-white/80 p-6 text-center text-lg shadow">
          엄마·아빠가 오늘 할 일을 만들어 줄 거예요 📝
        </p>
      )}

      <ul className="space-y-3">
        {view.routines.map((r, i) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 18 }}
          >
            <motion.button
              onClick={() => onToggle(r.id, r.done)}
              disabled={locked}
              whileTap={locked ? undefined : { scale: 0.94 }}
              animate={r.done ? { scale: [1, 1.07, 1] } : { scale: 1 }}
              className={`flex w-full items-center gap-4 rounded-3xl p-4 text-left shadow-md transition-colors ${
                r.done ? "bg-emerald-200" : "bg-white"
              } ${locked ? "opacity-90" : ""}`}
            >
              <span className="text-5xl">{r.icon}</span>
              <span className="flex-1 text-2xl">{r.title}</span>
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full border-4 text-3xl ${
                  r.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-slate-50"
                }`}
              >
                {r.done && (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                    ✔
                  </motion.span>
                )}
              </span>
            </motion.button>
          </motion.li>
        ))}
      </ul>

      <StatusPanel status={status} note={view.submission?.reject_note ?? null} locked={locked} />

      {view.waiting_days > (status === "pending" ? 1 : 0) && (
        <p className="text-center text-base text-black/60">
          기다리는 승인이 {view.waiting_days}개 있어요 ⏳
        </p>
      )}

      {demo && (
        <div className="space-y-2 rounded-3xl border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-base">
          <p className="text-center font-bold text-violet-700">🧪 데모 도구 (실서비스에는 안 보여요)</p>
          <div className="grid grid-cols-2 gap-2">
            {status === "pending" && (
              <>
                <button className="rounded-2xl bg-pink-400 py-2 text-white" onClick={() => demo.approve("mom")}>
                  👩 엄마가 승인
                </button>
                <button className="rounded-2xl bg-sky-400 py-2 text-white" onClick={() => demo.approve("dad")}>
                  👨 아빠가 승인
                </button>
              </>
            )}
            <button className="rounded-2xl bg-pink-300 py-2 text-white" onClick={() => demo.bonus("mom")}>
              🎁 엄마 보너스
            </button>
            <button className="rounded-2xl bg-sky-300 py-2 text-white" onClick={() => demo.bonus("dad")}>
              🎁 아빠 보너스
            </button>
            <button className="rounded-2xl bg-violet-400 py-2 text-white" onClick={demo.nextDay}>
              🌅 내일이 됐어요
            </button>
            <button className="rounded-2xl bg-violet-400 py-2 text-white" onClick={demo.fill}>
              ⏩ 다음 선물 직전까지 채우기
            </button>
            <button className="col-span-2 rounded-2xl bg-amber-400 py-2 text-white" onClick={demo.give}>
              🎁 부모: 첫 쿠폰 “레고 블록” 선물 기록
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPanel({
  status,
  note,
  locked,
}: {
  status: SubmissionStatus | undefined;
  note: string | null;
  locked: boolean;
}) {
  if (status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-amber-100 p-5 text-center shadow-md"
      >
        <motion.div
          className="text-6xl"
          initial={{ x: -120, y: 40, rotate: -25, opacity: 0 }}
          animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 12 }}
        >
          💌
        </motion.div>
        <p className="mt-2 text-2xl">엄마·아빠에게 알렸어요!</p>
        <motion.p
          className="mt-1 text-lg text-black/60"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          두근두근 기다려요… ⏳
        </motion.p>
      </motion.div>
    );
  }
  if (status === "approved") {
    return (
      <div className="rounded-3xl bg-pink-100 p-5 text-center shadow-md">
        <div className="text-6xl">🎉</div>
        <p className="mt-2 text-2xl">오늘 스티커를 받았어요!</p>
        <p className="text-lg text-black/60">내일 또 만나요 👋</p>
      </div>
    );
  }
  if (status === "rejected" && !locked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-sky-100 p-5 text-center shadow-md"
      >
        <motion.div className="text-6xl" animate={{ rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          💪
        </motion.div>
        <p className="mt-2 text-2xl">조금만 더 해볼까?</p>
        {note && <p className="mt-1 text-lg text-black/60">“{note}”</p>}
      </motion.div>
    );
  }
  return null;
}
