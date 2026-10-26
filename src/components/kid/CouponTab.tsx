"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { KidView } from "@/lib/types";

export function CouponTab({ view }: { view: KidView }) {
  if (view.coupons.length === 0) {
    return (
      <div className="rounded-3xl bg-white/80 p-8 text-center shadow">
        <div className="text-6xl">🎟️</div>
        <p className="mt-3 text-xl">스티커를 모으면</p>
        <p className="text-xl">선물 쿠폰이 생겨요!</p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {view.coupons.map((c, i) => (
        <CouponCard
          key={c.id}
          name={c.tier_name ?? "선물"}
          count={c.tier_count}
          giftNote={c.gift_note}
          used={Boolean(c.used_at)}
          delay={i * 0.08}
        />
      ))}
    </ul>
  );
}

function CouponCard({
  name,
  count,
  giftNote,
  used,
  delay,
}: {
  name: string;
  count: number | null;
  giftNote: string | null;
  used: boolean;
  delay: number;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <motion.li
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ perspective: 800 }}
    >
      <motion.button
        onClick={() => setFlipped((f) => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative h-40 w-full"
      >
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center rounded-3xl shadow-lg ring-4 ring-white ${
            used ? "bg-slate-200 grayscale" : "bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-300"
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-5xl">🎟️</span>
          <span className="mt-1 text-2xl">{name} 쿠폰</span>
          <span className="text-base text-black/60">
            {count ? `스티커 ${count}개 · ` : ""}
            {used ? "선물을 받았어요" : "눌러서 열어봐요!"}
          </span>
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-white shadow-lg ring-4 ring-amber-200"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-6xl">{giftNote ? "🎉" : "🧸"}</span>
          <span className="mt-1 px-3 text-2xl">{giftNote ?? name}</span>
          <span className="text-base text-black/60">
            {giftNote ? "엄마·아빠가 선물을 줬어요!" : "엄마·아빠와 같이 고르러 가요!"}
          </span>
        </div>
      </motion.button>
    </motion.li>
  );
}
