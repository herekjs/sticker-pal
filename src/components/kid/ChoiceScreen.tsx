"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { RewardTier } from "@/lib/types";

/** 중간 단계에 도달했을 때: STOP(선물 받기) 또는 GO(더 모아서 더 큰 선물) */
export function ChoiceScreen({
  count,
  tier,
  next,
  emoji,
  onChoose,
}: {
  count: number;
  tier: RewardTier | undefined;
  next: RewardTier | undefined;
  emoji: string;
  onChoose: (choice: "stop" | "go") => void;
}) {
  const [confirm, setConfirm] = useState<"stop" | "go" | null>(null);
  const giftName = tier?.name ?? "선물";

  return (
    <motion.div
      className="fixed inset-0 z-[45] flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-amber-200 via-pink-100 to-sky-100 px-5 py-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-8xl"
        animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        🎁
      </motion.div>
      <h2 className="mt-4 text-3xl">
        {emoji} {count}개 모았어요!
      </h2>
      <p className="mt-1 text-xl text-black/60">어떻게 할까요?</p>

      {!confirm && (
        <div className="mt-6 w-full max-w-sm space-y-4">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setConfirm("stop")}
            className="w-full rounded-[2rem] bg-gradient-to-br from-rose-300 to-orange-300 p-5 text-2xl shadow-lg ring-4 ring-white"
          >
            <span className="block text-4xl">✋ STOP</span>
            <span className="mt-1 block">지금 {giftName} 받기</span>
          </motion.button>

          {next ? (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setConfirm("go")}
              className="w-full rounded-[2rem] bg-gradient-to-br from-emerald-300 to-sky-300 p-5 text-2xl shadow-lg ring-4 ring-white"
            >
              <span className="block text-4xl">🚀 GO</span>
              <span className="mt-1 block">
                더 모아서 {next.count}개면 {next.name}!
              </span>
            </motion.button>
          ) : null}
        </div>
      )}

      {confirm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-lg"
        >
          <p className="text-2xl">
            {confirm === "stop" ? `정말 ${giftName}을 받을래요?` : `더 모아서 ${next?.name}에 도전할래요?`}
          </p>
          <p className="mt-1 text-base text-black/60">
            {confirm === "stop"
              ? "선물을 받으면 이 스티커판은 끝나고 새 판을 시작해요."
              : "스티커를 계속 모아요. 힘내요!"}
          </p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setConfirm(null)} className="flex-1 rounded-2xl bg-slate-100 py-3 text-xl">
              다시 생각
            </button>
            <button
              onClick={() => onChoose(confirm)}
              className="flex-1 rounded-2xl bg-amber-400 py-3 text-xl shadow"
            >
              좋아요!
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
