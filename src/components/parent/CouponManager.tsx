"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { KidRow, Me } from "./ParentApp";

interface Coupon {
  id: string;
  title: string;
  issued_at: string;
  used_at: string | null;
}

export function CouponManager({ me, kid }: { me: Me; kid: KidRow }) {
  const [list, setList] = useState<Coupon[]>([]);

  const load = useCallback(async () => {
    const { data } = await getSupabase()
      .from("coupons")
      .select("id, title, issued_at, used_at")
      .eq("kid_id", kid.id)
      .order("issued_at", { ascending: false });
    setList((data ?? []) as Coupon[]);
  }, [kid.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const use = async (c: Coupon) => {
    if (!confirm("장난감을 사 줬나요? 쿠폰을 사용 처리할게요.")) return;
    await getSupabase()
      .from("coupons")
      .update({ used_at: new Date().toISOString(), used_by: me.id })
      .eq("id", c.id);
    load();
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString("ko-KR");

  if (list.length === 0)
    return <p className="rounded-2xl bg-white p-8 text-center shadow">아직 쿠폰이 없어요. 스티커 30개를 모으면 생겨요!</p>;

  return (
    <ul className="space-y-2">
      {list.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow">
          <span className="text-4xl">{c.used_at ? "✅" : "🎟️"}</span>
          <div className="flex-1">
            <p className="text-xl">{c.title}</p>
            <p className="text-sm text-black/50">
              {fmt(c.issued_at)} 발급{c.used_at ? ` · ${fmt(c.used_at)} 사용` : ""}
            </p>
          </div>
          {!c.used_at && (
            <button onClick={() => use(c)} className="rounded-xl bg-emerald-400 px-3 py-2 text-white">
              사용 완료
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
