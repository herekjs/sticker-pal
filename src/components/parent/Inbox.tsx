"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { KidRow, Me } from "./ParentApp";

interface Req {
  id: string;
  kid_id: string;
  date: string;
  submitted_at: string;
}
interface Routine {
  id: string;
  kid_id: string;
  title: string;
  icon: string;
}

const MESSAGES: Record<string, string> = {
  "theme not chosen": "아이가 먼저 스티커판을 골라야 해요. 아이 화면에서 골라 달라고 해 주세요.",
  "not your family": "이 아이에게는 줄 수 없어요.",
  "already decided": "이미 처리된 요청이에요.",
  "waiting for choice": "아이가 STOP/GO를 고르는 중이에요. 고른 뒤에 다시 시도해 주세요.",
};

const errMsg = (m: string) => MESSAGES[m] ?? m;

function doneMessage(data: { slot_no?: number; coupon?: boolean; choice?: boolean } | null, icon: string) {
  if (data?.coupon) return "🎉 마지막 단계 완성! 선물 쿠폰이 생겼어요.";
  if (data?.choice) return `${icon} ${data.slot_no}번째 스티커! 아이가 STOP/GO를 고르는 중이에요.`;
  return `${icon} ${data?.slot_no}번째 스티커를 줬어요!`;
}

const fmtDate = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${"일월화수목금토"[dt.getDay()]}요일`;
};

export function Inbox({
  me,
  kid,
  kids,
  onCount,
}: {
  me: Me;
  kid: KidRow; // 보너스 스티커를 줄 아이(선택된 아이)
  kids: KidRow[]; // 승인 요청은 모든 아이 것을 보여줌
  onCount: (n: number) => void;
}) {
  const kidIds = kids.map((k) => k.id);
  const kidKey = kidIds.join(",");
  const [reqs, setReqs] = useState<Req[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [choosing, setChoosing] = useState<{ kid_id: string; choice_at: number }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [r, rt, ch] = await Promise.all([
      sb
        .from("submissions")
        .select("id, kid_id, date, submitted_at")
        .in("kid_id", kidIds)
        .eq("status", "pending")
        .order("date"),
      sb
        .from("routines")
        .select("id, kid_id, title, icon")
        .in("kid_id", kidIds)
        .eq("is_active", true)
        .order("sort_order"),
      sb
        .from("boards")
        .select("kid_id, choice_at")
        .in("kid_id", kidIds)
        .is("completed_at", null)
        .not("choice_at", "is", null),
    ]);
    const list = (r.data ?? []) as Req[];
    setReqs(list);
    setRoutines((rt.data ?? []) as Routine[]);
    setChoosing((ch.data ?? []) as { kid_id: string; choice_at: number }[]);
    onCount(list.length);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidKey, onCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 8000);
    return () => clearInterval(id);
  }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    setMsg("");
    const { data, error } = await getSupabase().rpc("approve_submission", { p_id: id });
    if (error) setMsg(errMsg(error.message));
    else setMsg(doneMessage(data, "⭐"));
    setBusy(null);
    load();
  };

  const giveBonus = async () => {
    const note = prompt("아이에게 한마디 (비워도 돼요)\n예: 동생 잘 돌봐줬어!", "");
    if (note === null) return;
    if (!confirm(`🎁 ${kid.name}에게 보너스 스티커를 줄까요?`)) return;
    setBusy("bonus");
    setMsg("");
    const { data, error } = await getSupabase().rpc("give_bonus_sticker", { p_kid: kid.id, p_note: note });
    if (error) setMsg(errMsg(error.message));
    else setMsg(doneMessage(data, "🎁"));
    setBusy(null);
  };

  const reject = async (id: string) => {
    const note = prompt("아이에게 한마디 (비워도 돼요)", "") ?? null;
    if (note === null) return;
    setBusy(id);
    setMsg("");
    const { error } = await getSupabase().rpc("reject_submission", { p_id: id, p_note: note });
    if (error) setMsg(errMsg(error.message));
    else setMsg("다시 해보라고 알려줬어요.");
    setBusy(null);
    load();
  };

  if (!loaded) return <p>불러오는 중…</p>;

  return (
    <div className="space-y-3">
      {msg && <p className="rounded-2xl bg-sky-100 p-3 text-base">{msg}</p>}
      {choosing.map((c) => {
        const k = kids.find((x) => x.id === c.kid_id);
        return (
          <p key={c.kid_id} className="rounded-2xl bg-amber-100 p-3 text-base">
            🎁 {k?.avatar} {k?.name}가 스티커 {c.choice_at}개를 모았어요. STOP(선물 받기)/GO(더 모으기)를 고르는
            중이에요. 고를 때까지 새 스티커는 줄 수 없어요.
          </p>
        );
      })}
      <button
        disabled={busy === "bonus"}
        onClick={giveBonus}
        className="w-full rounded-2xl bg-gradient-to-r from-pink-300 to-amber-300 py-3 text-xl shadow disabled:opacity-50"
      >
        🎁 {kid.name}에게 보너스 스티커 주기
      </button>
      {reqs.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow">
          <div className="text-5xl">😊</div>
          <p className="mt-2">기다리는 승인 요청이 없어요.</p>
        </div>
      )}
      {reqs.map((r) => (
        <section key={r.id} className="rounded-2xl bg-white p-4 shadow">
          <p className="text-xl">
            {kids.find((k) => k.id === r.kid_id)?.avatar} {kids.find((k) => k.id === r.kid_id)?.name}가 다 했어요!
          </p>
          <p className="text-base text-black/60">{fmtDate(r.date)}</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-base">
            {routines.filter((rt) => rt.kid_id === r.kid_id).map((rt) => (
              <li key={rt.id} className="rounded-full bg-emerald-100 px-3 py-1">
                {rt.icon} {rt.title} ✔
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy === r.id}
              onClick={() => approve(r.id)}
              className="flex-1 rounded-xl bg-emerald-400 py-3 text-xl text-white shadow disabled:opacity-50"
            >
              ✅ 스티커 주기{me.role === "mom" ? " (엄마)" : " (아빠)"}
            </button>
            <button
              disabled={busy === r.id}
              onClick={() => reject(r.id)}
              className="rounded-xl bg-slate-100 px-4 py-3 disabled:opacity-50"
            >
              다시
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
