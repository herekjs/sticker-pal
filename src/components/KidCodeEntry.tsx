"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function KidCodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) router.push(`/kid/${code.trim().toLowerCase()}`);
      }}
      className="flex gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
        placeholder="아이 코드 입력"
        autoCapitalize="none"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-3xl border-4 border-white bg-white/90 px-4 py-3 text-center text-xl tracking-widest shadow"
      />
      <button disabled={!code} className="rounded-3xl bg-amber-300 px-5 text-xl shadow disabled:opacity-40">
        가기
      </button>
    </form>
  );
}
