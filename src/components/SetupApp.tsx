"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Step = "loading" | "closed" | "admin" | "form" | "done";

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했어요.");
  return data;
}

const input = "w-full rounded-2xl border-2 border-amber-200 bg-white px-4 py-3";

export default function SetupApp() {
  const [step, setStep] = useState<Step>("loading");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [adminId, setAdminId] = useState("ADMIN");
  const [adminPw, setAdminPw] = useState("");
  const [momId, setMomId] = useState("mom");
  const [momPw, setMomPw] = useState("");
  const [dadId, setDadId] = useState("dad");
  const [dadPw, setDadPw] = useState("");
  const [kidName, setKidName] = useState("");

  useEffect(() => {
    post({ action: "status" })
      .then((d) => setStep(d.open ? "admin" : "closed"))
      .catch((e) => {
        setErr(e.message);
        setStep("admin");
      });
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "문제가 생겼어요.");
    }
    setBusy(false);
  };

  const adminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await post({ action: "login", adminId, adminPassword: adminPw });
      setStep("form");
    });
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await post({
        action: "create",
        adminId,
        adminPassword: adminPw,
        mom: { id: momId, password: momPw },
        dad: { id: dadId, password: dadPw },
        kidName,
      });
      setStep("done");
    });
  };

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#fff8e7] p-4 text-lg">
      <div className="mt-10 text-center">
        <div className="text-7xl">🛠️</div>
        <h1 className="mt-2 text-3xl">처음 설정</h1>
      </div>

      {step === "loading" && <p className="mt-8 text-center">확인 중…</p>}

      {step === "closed" && (
        <div className="mt-8 space-y-4 text-center">
          <p className="rounded-2xl bg-white p-4 shadow">이미 설정이 끝났어요. 부모 로그인을 사용해 주세요.</p>
          <Link href="/parent" className="inline-block rounded-2xl bg-amber-400 px-6 py-3 shadow">
            부모 로그인
          </Link>
        </div>
      )}

      {step === "admin" && (
        <form onSubmit={adminLogin} className="mt-8 space-y-3">
          <p className="text-base text-black/60">
            관리자(ADMIN)로 로그인하면 엄마·아빠 계정과 아이를 만들 수 있어요. 설정이 끝나면 이 화면은 자동으로 닫혀요.
          </p>
          <input value={adminId} onChange={(e) => setAdminId(e.target.value)} placeholder="관리자 아이디" className={input} />
          <input
            value={adminPw}
            onChange={(e) => setAdminPw(e.target.value)}
            type="password"
            placeholder="관리자 비밀번호"
            className={input}
          />
          {err && <p className="text-base text-rose-600">{err}</p>}
          <button disabled={busy || !adminPw} className="w-full rounded-2xl bg-amber-400 py-3 text-xl shadow disabled:opacity-50">
            {busy ? "확인 중…" : "관리자 로그인"}
          </button>
        </form>
      )}

      {step === "form" && (
        <form onSubmit={create} className="mt-6 space-y-4">
          <section className="space-y-2 rounded-2xl bg-white p-4 shadow">
            <h2 className="text-xl">👩 엄마 계정</h2>
            <input value={momId} onChange={(e) => setMomId(e.target.value)} placeholder="아이디 (영문/숫자)" autoCapitalize="none" className={input} />
            <input value={momPw} onChange={(e) => setMomPw(e.target.value)} type="password" placeholder="비밀번호 (6자 이상)" className={input} />
          </section>
          <section className="space-y-2 rounded-2xl bg-white p-4 shadow">
            <h2 className="text-xl">👨 아빠 계정</h2>
            <input value={dadId} onChange={(e) => setDadId(e.target.value)} placeholder="아이디 (영문/숫자)" autoCapitalize="none" className={input} />
            <input value={dadPw} onChange={(e) => setDadPw(e.target.value)} type="password" placeholder="비밀번호 (6자 이상)" className={input} />
          </section>
          <section className="space-y-2 rounded-2xl bg-white p-4 shadow">
            <h2 className="text-xl">🧒 아이</h2>
            <input value={kidName} onChange={(e) => setKidName(e.target.value)} placeholder="아이 이름" maxLength={20} className={input} />
          </section>
          {err && <p className="text-base text-rose-600">{err}</p>}
          <button
            disabled={busy || !momId || !dadId || momPw.length < 6 || dadPw.length < 6 || !kidName.trim()}
            className="w-full rounded-2xl bg-emerald-400 py-3 text-xl text-white shadow disabled:opacity-50"
          >
            {busy ? "만드는 중…" : "시작하기"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-8 space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <p className="text-2xl">준비됐어요!</p>
          <p className="text-base text-black/60">방금 만든 아이디와 비밀번호로 로그인해 주세요.</p>
          <Link href="/parent" className="inline-block rounded-2xl bg-amber-400 px-6 py-3 shadow">
            부모 로그인
          </Link>
        </div>
      )}
    </div>
  );
}
