"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, hasSupabase, idToEmail } from "@/lib/supabase";
import { ROLE_EMOJI, ROLE_LABEL, type Role } from "@/lib/types";
import { Inbox } from "./Inbox";
import { RoutineEditor } from "./RoutineEditor";
import { CouponManager } from "./CouponManager";

export interface Me {
  id: string;
  role: Role;
  family_id: string;
}
export interface KidRow {
  id: string;
  name: string;
  avatar: string;
  view_token: string;
}

type Tab = "inbox" | "routines" | "coupons" | "settings";

export default function ParentApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!hasSupabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(null);
      return;
    }
    const sb = getSupabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <Page>불러오는 중…</Page>;
  if (!session) return <Login />;
  return <Dashboard userId={session.user.id} />;
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-lg bg-[#fff8e7] p-4 text-lg">{children}</div>;
}

function Login() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: idToEmail(id),
        password: pw,
      });
      if (error) setErr("아이디 또는 비밀번호가 맞지 않아요.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그인에 실패했어요.");
    }
    setBusy(false);
  };

  return (
    <Page>
      <div className="mt-16 text-center">
        <div className="text-7xl">👨‍👩‍👧</div>
        <h1 className="mt-2 text-3xl">엄마·아빠 로그인</h1>
      </div>
      {!hasSupabase && (
        <p className="mt-6 rounded-2xl bg-amber-100 p-3 text-base">
          아직 Supabase가 연결되지 않았어요. README의 설정 방법을 따라 .env.local을 만들어 주세요.
        </p>
      )}
      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="아이디 (mom 또는 dad)"
          autoCapitalize="none"
          autoComplete="username"
          className="w-full rounded-2xl border-2 border-amber-200 bg-white px-4 py-3"
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          className="w-full rounded-2xl border-2 border-amber-200 bg-white px-4 py-3"
        />
        {err && <p className="text-base text-rose-600">{err}</p>}
        <button
          disabled={busy || !id || !pw || !hasSupabase}
          className="w-full rounded-2xl bg-amber-400 py-3 text-xl shadow disabled:opacity-50"
        >
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>
      <p className="mt-6 text-center text-base">
        <Link href="/" className="text-black/50 underline">
          처음으로
        </Link>
      </p>
    </Page>
  );
}

function Dashboard({ userId }: { userId: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [kid, setKid] = useState<KidRow | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [pending, setPending] = useState(0);
  const [loadErr, setLoadErr] = useState("");

  const load = useCallback(async () => {
    const sb = getSupabase();
    const { data: p, error } = await sb
      .from("profiles")
      .select("id, role, family_id")
      .eq("id", userId)
      .maybeSingle();
    if (error || !p) {
      setLoadErr("이 계정은 아직 가족에 연결되지 않았어요. seed.sql을 실행했는지 확인해 주세요.");
      return;
    }
    setMe(p as Me);
    const { data: k } = await sb
      .from("kids")
      .select("id, name, avatar, view_token")
      .eq("family_id", p.family_id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    setKid(k as KidRow | null);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) 승인 요청 - 스티커 친구` : "스티커 친구 - 부모";
  }, [pending]);

  if (loadErr)
    return (
      <Page>
        <p className="mt-10 rounded-2xl bg-rose-100 p-4">{loadErr}</p>
        <SignOut />
      </Page>
    );
  if (!me || !kid) return <Page>불러오는 중…</Page>;

  const tabs: [Tab, string][] = [
    ["inbox", `📬 승인함${pending ? ` (${pending})` : ""}`],
    ["routines", "📝 루틴"],
    ["coupons", "🎟️ 쿠폰"],
    ["settings", "⚙️ 설정"],
  ];

  return (
    <Page>
      <header className="flex items-center justify-between">
        <p className="text-xl">
          {ROLE_EMOJI[me.role]} {ROLE_LABEL[me.role]} · {kid.avatar} {kid.name}
        </p>
        <Link
          href={`/kid/${kid.view_token}`}
          className="rounded-full bg-sky-200 px-4 py-2 text-base shadow"
        >
          아이 화면 보기
        </Link>
      </header>

      <nav className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-white p-1 text-sm shadow">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl py-2 ${tab === id ? "bg-amber-300" : ""}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {tab === "inbox" && <Inbox me={me} kid={kid} onCount={setPending} />}
        {tab === "routines" && <RoutineEditor kid={kid} />}
        {tab === "coupons" && <CouponManager me={me} kid={kid} />}
        {tab === "settings" && <Settings kid={kid} onChanged={load} />}
      </div>
    </Page>
  );
}

function SignOut() {
  return (
    <button
      onClick={() => getSupabase().auth.signOut()}
      className="mt-6 rounded-2xl bg-white px-4 py-2 text-base shadow"
    >
      로그아웃
    </button>
  );
}

function Settings({ kid, onChanged }: { kid: KidRow; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/kid/${kid.view_token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("복사에 실패했어요. 링크를 길게 눌러 복사해 주세요.");
    }
  };

  const regenerate = async () => {
    if (!confirm("새 링크를 만들면 지금 링크는 더 이상 쓸 수 없어요. 계속할까요?")) return;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await getSupabase().from("kids").update({ view_token: token }).eq("id", kid.id);
    if (error) setErr(error.message);
    else onChanged();
  };

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-2xl bg-white p-4 shadow">
        <h2 className="text-xl">🔗 아이 전용 링크</h2>
        <p className="text-base text-black/60">
          아이 폰에서 이 링크를 열고 “홈 화면에 추가”하면 앱처럼 쓸 수 있어요. 링크를 아는 사람은 오늘 할 일
          체크만 할 수 있어요.
        </p>
        <p className="break-all rounded-xl bg-amber-50 p-2 text-sm">{link}</p>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 rounded-xl bg-amber-300 py-2">
            {copied ? "복사됐어요 ✔" : "링크 복사"}
          </button>
          <button onClick={regenerate} className="rounded-xl bg-rose-100 px-4 py-2">
            새 링크
          </button>
        </div>
        {err && <p className="text-base text-rose-600">{err}</p>}
      </section>
      <SignOut />
    </div>
  );
}
