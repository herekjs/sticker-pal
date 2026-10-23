"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { bigCelebration } from "@/lib/confetti";
import { ROLE_LABEL, type Role } from "@/lib/types";

export interface CelebrationInfo {
  kind: "sticker" | "coupon";
  role: Role | null;
  emoji: string;
}

export function Celebration({ info, onClose }: { info: CelebrationInfo; onClose: () => void }) {
  useEffect(() => {
    const land = setTimeout(bigCelebration, 650);
    const close = setTimeout(onClose, 5200);
    return () => {
      clearTimeout(land);
      clearTimeout(close);
    };
  }, [onClose]);

  const who = info.role ? ROLE_LABEL[info.role] : "엄마·아빠";
  const isCoupon = info.kind === "coupon";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/55 px-6 text-center text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="text-[8rem] leading-none drop-shadow-2xl"
        initial={{ y: -500, rotate: -540, scale: 0.4 }}
        animate={{ y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 11, mass: 1.1 }}
      >
        {isCoupon ? "🎟️" : info.emoji}
      </motion.div>
      <motion.p
        className="mt-6 text-4xl"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: "spring" }}
      >
        {isCoupon ? "장난감 쿠폰이 생겼어요!" : `${who}가 승인했어요!`}
      </motion.p>
      <motion.p
        className="mt-3 text-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        {isCoupon ? "🎉 30개를 다 모았어! 최고야! 🎉" : "스티커가 붙었어요 ✨"}
      </motion.p>
    </motion.div>
  );
}
