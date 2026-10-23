"use client";

import { motion } from "framer-motion";
import type { KidView, Theme } from "@/lib/types";
import { ROLE_EMOJI } from "@/lib/types";

export function StickerBoard({ view, theme }: { view: KidView; theme: Theme }) {
  const size = view.board?.size ?? 30;
  const count = view.stickers.length;
  const bySlot = new Map(view.stickers.map((s) => [s.slot_no, s]));
  const mom = view.stickers.filter((s) => s.role === "mom").length;
  const dad = view.stickers.filter((s) => s.role === "dad").length;
  const left = size - count;

  return (
    <div className="space-y-4">
      <div
        className="rounded-[2rem] p-4 shadow-lg ring-4 ring-white/70"
        style={{ background: `linear-gradient(160deg, ${theme.color}, #ffffff 140%)` }}
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xl">
            {theme.emoji} {theme.name} 스티커판
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-lg">
            {count} / {size}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: size }, (_, i) => i + 1).map((n) => {
            const st = bySlot.get(n);
            const isNext = n === count + 1;
            return (
              <div
                key={n}
                className={`relative flex aspect-square items-center justify-center rounded-2xl text-3xl ${
                  st ? "bg-white shadow-md" : "bg-white/40"
                } ${isNext ? "animate-pulse ring-4 ring-white ring-offset-2" : ""}`}
              >
                {st ? (
                  <>
                    <motion.span
                      initial={{ scale: 0, rotate: -120 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 14, delay: Math.min(n, 12) * 0.03 }}
                    >
                      {theme.emoji}
                    </motion.span>
                    {st.role && (
                      <span className="absolute -bottom-1 -right-1 rounded-full bg-white text-xs leading-none shadow">
                        {ROLE_EMOJI[st.role]}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-bold text-black/25">{n}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow">
        <div className="mb-2 h-5 overflow-hidden rounded-full bg-amber-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400"
            initial={{ width: 0 }}
            animate={{ width: `${(count / size) * 100}%` }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
          />
        </div>
        <p className="text-center text-lg">
          {left <= 5 && left > 0 ? `조금만 더! ${left}개 남았어요 🔥` : left === 0 ? "다 모았어요! 🎉" : `쿠폰까지 ${left}개!`}
        </p>
        <p className="mt-1 text-center text-base text-black/60">
          {ROLE_EMOJI.mom} 엄마 {mom}개 · {ROLE_EMOJI.dad} 아빠 {dad}개
        </p>
      </div>
    </div>
  );
}
