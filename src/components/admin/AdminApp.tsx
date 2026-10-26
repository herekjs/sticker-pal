"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ROLE_EMOJI, ROLE_LABEL, type Role } from "@/lib/types";

interface FamilyRow {
  id: string;
  name: string;
  parents: { id: string; role: Role; loginId: string }[];
  kids: { id: string; name: string; avatar: string; code: string; stickers: number }[];
}

async function api<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "요청에 실패했어요."), { status: res.status });
  return data as T;
}

const input = "w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2";

export default function AdminApp() {
  const [state, setState] = useState<"loading" | "login" | "in">("loading");
  const [weak, setWeak] = useState(false);

  useEffect(() => {
    api<{ weakPassword: boolean }>({ action: "me" })
      .then((d) => {
        setWeak(d.weakPassword);
        setState("in");
      })
      .catch(() => setState("login"));
  }, []);

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#fff8e7] p-4 text-lg">
      <div className="mt-6 text-center">
        <div className="text-6xl">🛠️</div>
        <h1 className="mt-1 text-3xl">관리자</h1>
      </div>
      {state === "loading" && <p className="mt-8 text-center">확인 중…</p>}
      {state === "login" && (
        <Login
          onDone={async () => {
            const d = await api<{ weakPassword: boolean }>({ action: "me" });
            setWeak(d.weakPassword);
            setState("in");
          }}
        />
      )}
      {state === "in" && (
        <Console
          weak={weak}
          onLogout={async () => {
            await api({ action: "logout" });
            setState("login");
          }}
        />
      )}
    </div>
  );
}

function Login({ onDone }: { onDone: () => Promise<void> }) {
  const [id, setId] = useState("ADMIN");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api({ action: "login", adminId: id, adminPassword: pw });
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그인에 실패했어요.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <p className="text-base text-black/60">모든 가족을 만들고 관리하는 화면이에요.</p>
      <input value={id} onChange={(e) => setId(e.target.value)} className={input} placeholder="관리자 아이디" />
      <input
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        type="password"
        placeholder="관리자 비밀번호"
        className={input}
      />
      {err && <p className="text-base text-rose-600">{err}</p>}
      <button disabled={busy || !pw} className="w-full rounded-2xl bg-amber-400 py-3 text-xl shadow disabled:opacity-50">
        {busy ? "확인 중…" : "관리자 로그인"}
      </button>
      <p className="text-center text-base">
        <Link href="/" className="text-black/50 underline">
          처음으로
        </Link>
      </p>
    </form>
  );
}

function Console({ weak, onLogout }: { weak: boolean; onLogout: () => void }) {
  const [families, setFamilies] = useState<FamilyRow[] | null>(null);
  const [max, setMax] = useState(5);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api<{ families: FamilyRow[]; max: number }>({ action: "list" });
      setFamilies(d.families);
      setMax(d.max);
    } catch (e) {
      if ((e as { status?: number }).status === 401) location.reload();
      else setErr(e instanceof Error ? e.message : "불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = async (body: Record<string, unknown>, ok: string) => {
    setErr("");
    setMsg("");
    try {
      await api(body);
      setMsg(ok);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패했어요.");
    }
  };

  return (
    <div className="mt-4 space-y-4">
      {weak && (
        <p className="rounded-2xl bg-rose-100 p-3 text-base">
          ⚠️ 관리자 비밀번호가 기본값(1234)이에요. 인터넷에 배포했다면 환경변수 <b>ADMIN_PASSWORD</b>를 꼭 바꿔 주세요.
        </p>
      )}
      {msg && <p className="rounded-2xl bg-sky-100 p-3 text-base">{msg}</p>}
      {err && <p className="rounded-2xl bg-rose-100 p-3 text-base">{err}</p>}

      <div className="flex items-center justify-between">
        <p className="text-xl">
          가족 {families?.length ?? "…"} / {max}
        </p>
        <div className="flex gap-2">
          <button
            disabled={!families || families.length >= max}
            onClick={() => setAdding((v) => !v)}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-white disabled:opacity-40"
          >
            + 가족 추가
          </button>
          <button onClick={onLogout} className="rounded-xl bg-white px-3 py-2 shadow">
            로그아웃
          </button>
        </div>
      </div>

      {adding && (
        <AddFamily
          onCreated={() => {
            setAdding(false);
            setMsg("가족을 만들었어요 🎉 아이디와 비밀번호를 가족에게 알려 주세요.");
            load();
          }}
        />
      )}

      {families?.length === 0 && !adding && (
        <p className="rounded-2xl bg-white p-6 text-center shadow">아직 가족이 없어요. “가족 추가”를 눌러 시작하세요.</p>
      )}

      {families?.map((f) => (
        <section key={f.id} className="space-y-3 rounded-2xl bg-white p-4 shadow">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl">👨‍👩‍👧 {f.name}</h2>
            <div className="flex gap-1 text-base">
              <button
                onClick={() => {
                  const name = prompt("가족 이름", f.name);
                  if (name?.trim()) act({ action: "renameFamily", familyId: f.id, name }, "이름을 바꿨어요.");
                }}
                className="rounded-lg bg-slate-100 px-2 py-1"
              >
                이름 변경
              </button>
              <button
                onClick={() => {
                  const c = prompt(`“${f.name}” 가족의 모든 데이터가 삭제돼요. 삭제하려면 가족 이름을 똑같이 입력하세요.`);
                  if (c !== null) act({ action: "deleteFamily", familyId: f.id, confirmName: c }, "가족을 삭제했어요.");
                }}
                className="rounded-lg bg-rose-100 px-2 py-1"
              >
                삭제
              </button>
            </div>
          </div>

          <ul className="space-y-1 text-base">
            {f.parents.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2">
                <span>
                  {ROLE_EMOJI[p.role]} {ROLE_LABEL[p.role]} · 아이디 <b>{p.loginId}</b>
                </span>
                <button
                  onClick={() => {
                    const pw = prompt(`${ROLE_LABEL[p.role]}의 새 비밀번호 (6자 이상)`);
                    if (pw) act({ action: "resetPassword", userId: p.id, password: pw }, "비밀번호를 바꿨어요.");
                  }}
                  className="rounded-lg bg-white px-2 py-1 shadow"
                >
                  비밀번호 재설정
                </button>
              </li>
            ))}
          </ul>

          <ul className="space-y-1 text-base">
            {f.kids.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-xl bg-sky-50 px-3 py-2">
                <span>
                  {k.avatar} {k.name}
                </span>
                <span className="text-black/60">
                  코드 {k.code} · 스티커 {k.stickers}개
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AddFamily({ onCreated }: { onCreated: () => void }) {
  const [familyName, setFamilyName] = useState("");
  const [momId, setMomId] = useState("");
  const [momPw, setMomPw] = useState("");
  const [dadId, setDadId] = useState("");
  const [dadPw, setDadPw] = useState("");
  const [kidName, setKidName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api({
        action: "createFamily",
        familyName,
        mom: { id: momId, password: momPw },
        dad: { id: dadId, password: dadPw },
        kidName,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "만들지 못했어요.");
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl">새 가족</h2>
      <input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="가족 이름 (예: 김씨네)" maxLength={30} className={input} />
      <div className="grid grid-cols-2 gap-2">
        <input value={momId} onChange={(e) => setMomId(e.target.value)} placeholder="👩 엄마 아이디" autoCapitalize="none" className={input} />
        <input value={momPw} onChange={(e) => setMomPw(e.target.value)} type="password" placeholder="비밀번호(6자+)" className={input} />
        <input value={dadId} onChange={(e) => setDadId(e.target.value)} placeholder="👨 아빠 아이디" autoCapitalize="none" className={input} />
        <input value={dadPw} onChange={(e) => setDadPw(e.target.value)} type="password" placeholder="비밀번호(6자+)" className={input} />
      </div>
      <input value={kidName} onChange={(e) => setKidName(e.target.value)} placeholder="🧒 아이 이름" maxLength={20} className={input} />
      <p className="text-sm text-black/50">아이디는 영문 소문자/숫자 2~20자이고, 모든 가족에서 겹치면 안 돼요. 아이는 나중에 부모가 1명 더 추가할 수 있어요.</p>
      {err && <p className="text-base text-rose-600">{err}</p>}
      <button
        disabled={busy || !momId || !dadId || momPw.length < 6 || dadPw.length < 6 || !kidName.trim()}
        className="w-full rounded-xl bg-emerald-400 py-3 text-xl text-white shadow disabled:opacity-50"
      >
        {busy ? "만드는 중…" : "가족 만들기"}
      </button>
    </form>
  );
}
