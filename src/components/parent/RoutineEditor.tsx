"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { KidRow } from "./ParentApp";

interface Routine {
  id: string;
  title: string;
  icon: string;
  sort_order: number;
}

const ICONS = ["🪥", "📚", "🧸", "🍚", "🛁", "🧦", "🎒", "💤", "🥛", "✏️", "🧹", "⭐"];

export function RoutineEditor({ kid }: { kid: KidRow }) {
  const [items, setItems] = useState<Routine[]>([]);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("routines")
      .select("id, title, icon, sort_order")
      .eq("kid_id", kid.id)
      .eq("is_active", true)
      .order("sort_order");
    if (error) setErr(error.message);
    setItems((data ?? []) as Routine[]);
  }, [kid.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const next = (items.at(-1)?.sort_order ?? 0) + 1;
    const { error } = await getSupabase()
      .from("routines")
      .insert({ kid_id: kid.id, title: title.trim(), icon, sort_order: next });
    if (error) return setErr(error.message);
    setTitle("");
    load();
  };

  const rename = async (r: Routine) => {
    const t = prompt("루틴 이름", r.title);
    if (!t?.trim()) return;
    await getSupabase().from("routines").update({ title: t.trim() }).eq("id", r.id);
    load();
  };

  const remove = async (r: Routine) => {
    if (!confirm(`“${r.title}” 루틴을 지울까요? (오늘부터 적용돼요)`)) return;
    // 지난 기록 보존을 위해 삭제 대신 비활성화
    await getSupabase().from("routines").update({ is_active: false }).eq("id", r.id);
    load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = items[i];
    const b = items[i + dir];
    if (!a || !b) return;
    const sb = getSupabase();
    await Promise.all([
      sb.from("routines").update({ sort_order: b.sort_order }).eq("id", a.id),
      sb.from("routines").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-base text-black/60">
        아이가 오늘 이 항목을 모두 체크하면 승인 요청이 와요. 변경은 오늘부터 적용돼요.
      </p>
      {err && <p className="rounded-xl bg-rose-100 p-2 text-base">{err}</p>}

      <ul className="space-y-2">
        {items.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow">
            <span className="text-3xl">{r.icon}</span>
            <span className="flex-1 text-xl">{r.title}</span>
            <button disabled={i === 0} onClick={() => move(i, -1)} className="px-2 disabled:opacity-30">
              ▲
            </button>
            <button disabled={i === items.length - 1} onClick={() => move(i, 1)} className="px-2 disabled:opacity-30">
              ▼
            </button>
            <button onClick={() => rename(r)} className="px-2">
              ✏️
            </button>
            <button onClick={() => remove(r)} className="px-2">
              🗑️
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center shadow">루틴이 없어요. 아래에서 추가해 주세요.</li>
        )}
      </ul>

      <form onSubmit={add} className="space-y-2 rounded-2xl bg-white p-3 shadow">
        <div className="flex flex-wrap gap-1">
          {ICONS.map((ic) => (
            <button
              type="button"
              key={ic}
              onClick={() => setIcon(ic)}
              className={`rounded-xl p-1 text-2xl ${icon === ic ? "bg-amber-300" : "bg-slate-50"}`}
            >
              {ic}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="새 루틴 (예: 양치하기)"
            className="min-w-0 flex-1 rounded-xl border-2 border-amber-200 px-3 py-2"
          />
          <button className="rounded-xl bg-amber-400 px-4">추가</button>
        </div>
      </form>
    </div>
  );
}
