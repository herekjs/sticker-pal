"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { DEFAULT_TIERS, type RewardTier } from "@/lib/types";
import type { KidRow } from "./ParentApp";

/** 아이의 선물 단계 설정: 개수(오름차순)와 선물 이름. 마지막 단계가 스티커판 크기. */
export function TierEditor({ kid, onChanged }: { kid: KidRow; onChanged: () => void }) {
  const [tiers, setTiers] = useState<RewardTier[]>(kid.reward_tiers?.length ? kid.reward_tiers : DEFAULT_TIERS);
  const [msg, setMsg] = useState("");

  const update = (i: number, patch: Partial<RewardTier>) => {
    setTiers((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setMsg("");
  };

  const validate = (): string | null => {
    let last = 0;
    for (const t of tiers) {
      if (!Number.isInteger(t.count) || t.count < 1 || t.count > 60) return "개수는 1~60 사이로 입력해 주세요.";
      if (t.count <= last) return "개수는 앞 단계보다 커야 해요.";
      if (!t.name.trim() || t.name.length > 20) return "선물 이름을 20자 이내로 입력해 주세요.";
      last = t.count;
    }
    return null;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) return setMsg(err);
    const { error } = await getSupabase().rpc("set_reward_tiers", { p_kid: kid.id, p_tiers: tiers });
    if (error) return setMsg(/invalid/i.test(error.message) ? "단계 설정이 올바르지 않아요." : error.message);
    setMsg("저장했어요 ✔ 다음 스티커판부터 적용돼요.");
    onChanged();
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl">🎁 선물 단계</h2>
      <p className="text-base text-black/60">
        스티커가 이 개수에 도달하면 아이가 <b>STOP(선물 받기)</b> 또는 <b>GO(더 모으기)</b>를 골라요. 마지막 단계는
        스티커판의 끝이고 자동으로 선물이 나와요.
      </p>
      <ul className="space-y-2">
        {tiers.map((t, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={t.count}
              onChange={(e) => update(i, { count: Number(e.target.value) })}
              className="w-16 rounded-xl border-2 border-amber-200 px-2 py-2 text-center"
              aria-label={`${i + 1}단계 스티커 개수`}
            />
            <span>개</span>
            <input
              value={t.name}
              maxLength={20}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="선물 이름"
              className="min-w-0 flex-1 rounded-xl border-2 border-amber-200 px-3 py-2"
            />
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => setTiers((x) => x.filter((_, j) => j !== i))}
                className="px-2"
                aria-label="단계 삭제"
              >
                🗑️
              </button>
            )}
          </li>
        ))}
      </ul>
      {tiers.length < 5 && (
        <button
          type="button"
          onClick={() =>
            setTiers((t) => [...t, { count: Math.min(60, (t.at(-1)?.count ?? 0) + 10), name: "선물" }])
          }
          className="w-full rounded-xl bg-slate-100 py-2"
        >
          + 단계 추가
        </button>
      )}
      <button className="w-full rounded-xl bg-amber-400 py-2">저장</button>
      {msg && <p className="text-base">{msg}</p>}
    </form>
  );
}
