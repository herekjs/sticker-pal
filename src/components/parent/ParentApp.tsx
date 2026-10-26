"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, hasSupabase, idToEmail } from "@/lib/supabase";
import { ROLE_EMOJI, ROLE_LABEL, type RewardTier, type Role } from "@/lib/types";
import { Inbox } from "./Inbox";
import { RoutineEditor } from "./RoutineEditor";
import { CouponManager } from "./CouponManager";
import { KidLinkCard } from "./KidLinkCard";
import { TierEditor } from "./TierEditor";

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
  reward_tiers: RewardTier[];
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
      <p className="mt-6 space-x-4 text-center text-base">
        <Link href="/admin" className="text-black/50 underline">
          관리자
        </Link>
        <Link href="/" className="text-black/50 underline">
          처음으로
        </Link>
      </p>
    </Page>
  );
}

function Dashboard({ userId }: { userId: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [kids, setKids] = useState<KidRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      setLoadErr("이 계정은 아직 가족에 연결되지 않았어요. 관리자에게 가족 생성을 요청해 주세요.");
      return;
    }
    setMe(p as Me);
    const { data: k } = await sb
      .from("kids")
      .select("id, name, avatar, view_token, reward_tiers")
      .eq("family_id", p.family_id)
      .order("created_at");
    setKids((k ?? []) as KidRow[]);
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
  if (!me || kids.length === 0) return <Page>불러오는 중…</Page>;
  const kid = kids.find((k) => k.id === selectedId) ?? kids[0];

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

      {kids.length > 1 && (
        <div className="mt-3 flex gap-2">
          {kids.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelectedId(k.id)}
              className={`flex-1 rounded-2xl px-3 py-2 text-xl shadow ${
                k.id === kid.id ? "bg-sky-300" : "bg-white"
              }`}
            >
              {k.avatar} {k.name}
            </button>
          ))}
        </div>
      )}

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
        {tab === "inbox" && <Inbox me={me} kid={kid} kids={kids} onCount={setPending} />}
        {tab === "routines" && <RoutineEditor kid={kid} />}
        {tab === "coupons" && <CouponManager me={me} kid={kid} />}
        {tab === "settings" && <Settings kids={kids} onChanged={load} />}
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

const AVATARS = ["🐻", "🐰", "🐱", "🐶", "🦊", "🐼", "🐯", "🦁", "🐸", "🐥", "🦄", "🐲"];

function ProfileEditor({ kid, onChanged }: { kid: KidRow; onChanged: () => void }) {
  const [name, setName] = useState(kid.name);
  const [avatar, setAvatar] = useState(kid.avatar);
  const [msg, setMsg] = useState("");
  const dirty = name.trim() !== kid.name || avatar !== kid.avatar;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await getSupabase()
      .from("kids")
      .update({ name: name.trim(), avatar })
      .eq("id", kid.id);
    if (error) return setMsg(error.message);
    setMsg("저장했어요 ✔");
    onChanged();
  };

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl">🧒 아이 정보</h2>
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setMsg("");
        }}
        maxLength={20}
        placeholder="아이 이름"
        className="w-full rounded-xl border-2 border-amber-200 px-3 py-2"
      />
      <div className="flex flex-wrap gap-1">
        {AVATARS.map((a) => (
          <button
            type="button"
            key={a}
            onClick={() => {
              setAvatar(a);
              setMsg("");
            }}
            className={`rounded-xl p-1 text-3xl ${avatar === a ? "bg-amber-300" : "bg-slate-50"}`}
          >
            {a}
          </button>
        ))}
      </div>
      <button disabled={!dirty || !name.trim()} className="w-full rounded-xl bg-amber-400 py-2 disabled:opacity-40">
        저장
      </button>
      {msg && <p className="text-base">{msg}</p>}
    </form>
  );
}

function PasswordEditor() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await getSupabase().auth.updateUser({ password: pw });
    if (error) return setMsg(error.message);
    setPw("");
    setMsg("비밀번호를 바꿨어요 ✔");
  };

  return (
    <form onSubmit={save} className="space-y-2 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl">🔑 내 비밀번호 변경</h2>
      <input
        value={pw}
        onChange={(e) => {
          setPw(e.target.value);
          setMsg("");
        }}
        type="password"
        autoComplete="new-password"
        placeholder="새 비밀번호 (6자 이상)"
        className="w-full rounded-xl border-2 border-amber-200 px-3 py-2"
      />
      <button disabled={pw.length < 6} className="w-full rounded-xl bg-amber-400 py-2 disabled:opacity-40">
        변경
      </button>
      {msg && <p className="text-base">{msg}</p>}
    </form>
  );
}

function Settings({ kids, onChanged }: { kids: KidRow[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const addKid = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const { error } = await getSupabase().rpc("add_kid", { p_name: name });
    if (error) {
      setErr(/limit/i.test(error.message) ? "아이는 가족당 최대 2명까지 추가할 수 있어요." : error.message);
      return;
    }
    setName("");
    setAdding(false);
    onChanged();
  };

  return (
    <div className="space-y-4">
      {kids.map((k) => (
        <div key={k.id} className="space-y-4">
          {kids.length > 1 && <h2 className="text-2xl">{k.avatar} {k.name}</h2>}
          <ProfileEditor key={`${k.id}-${k.name}-${k.avatar}`} kid={k} onChanged={onChanged} />
          <TierEditor key={`${k.id}-${JSON.stringify(k.reward_tiers)}`} kid={k} onChanged={onChanged} />
          <KidLinkCard kid={k} onChanged={onChanged} />
        </div>
      ))}

      {kids.length < 2 && (
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow">
          {adding ? (
            <form onSubmit={addKid} className="space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="아이 이름"
                maxLength={20}
                className="w-full rounded-xl border-2 border-amber-200 px-3 py-2"
              />
              <div className="flex gap-2">
                <button disabled={!name.trim()} className="flex-1 rounded-xl bg-emerald-400 py-2 text-white disabled:opacity-40">
                  추가
                </button>
                <button type="button" onClick={() => setAdding(false)} className="rounded-xl bg-slate-100 px-4">
                  취소
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full rounded-xl bg-emerald-400 py-2 text-white">
              + 아이 추가 (최대 2명)
            </button>
          )}
          {err && <p className="text-base text-rose-600">{err}</p>}
        </section>
      )}

      <PasswordEditor />
      <SignOut />
    </div>
  );
}
