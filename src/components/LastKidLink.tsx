"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LastKidLink() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try {
      const t = localStorage.getItem("sticker-kid-token");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (t && t !== "demo") setToken(t);
    } catch {}
  }, []);
  if (!token) return null;
  return (
    <Link
      href={`/kid/${token}`}
      className="rounded-3xl bg-amber-300 px-6 py-5 text-2xl shadow-lg ring-4 ring-white"
    >
      ⭐ 내 스티커판 보기
    </Link>
  );
}
