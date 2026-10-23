"use client";

import { motion } from "framer-motion";
import type { Theme } from "@/lib/types";

export function ThemePicker({
  themes,
  onPick,
  title,
}: {
  themes: Theme[];
  onPick: (id: string) => void;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <motion.h2
        className="text-center text-2xl"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        {title}
      </motion.h2>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((t, i) => (
          <motion.button
            key={t.id}
            onClick={() => onPick(t.id)}
            initial={{ opacity: 0, y: 30, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: i * 0.07, type: "spring", stiffness: 200, damping: 14 }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.04, rotate: 1 }}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-3xl text-xl shadow-md ring-4 ring-white"
            style={{ background: `linear-gradient(150deg, ${t.color}, #fff 150%)` }}
          >
            <span className="text-5xl">{t.emoji}</span>
            <span className="mt-1">{t.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
