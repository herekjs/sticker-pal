"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getSupabase } from "@/lib/supabase";
import type { KidRow } from "./ParentApp";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // 헷갈리는 글자(0/o, 1/l/i) 제외
const CODE_RE = /^[a-z0-9]{6,32}$/;

function randomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function KidLinkCard({ kid, onChanged }: { kid: KidRow; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [custom, setCustom] = useState("");
  const [qr, setQr] = useState("");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = `${origin}/kid/${kid.view_token}`;
  const short = kid.view_token.length <= 12;

  useEffect(() => {
    if (!origin) return;
    QRCode.toDataURL(`${origin}/kid/${kid.view_token}`, { margin: 1, width: 220 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [origin, kid.view_token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("복사에 실패했어요. 링크를 길게 눌러 복사해 주세요.");
    }
  };

  const setCode = async (code: string) => {
    setErr("");
    if (!CODE_RE.test(code)) return setErr("코드는 영문 소문자/숫자 6자 이상이어야 해요.");
    if (code === kid.view_token) return;
    if (!confirm("코드를 바꾸면 지금 쓰던 링크는 더 이상 열리지 않아요. 계속할까요?")) return;
    const { error } = await getSupabase().from("kids").update({ view_token: code }).eq("id", kid.id);
    if (error) setErr(/duplicate|unique/i.test(error.message) ? "이미 쓰는 코드예요. 다른 코드를 써 주세요." : error.message);
    else {
      setCustom("");
      onChanged();
    }
  };

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl">🔗 아이 전용 링크</h2>
      <p className="text-base text-black/60">
        아이 폰에서 열고 “홈 화면에 추가”하면 앱처럼 쓸 수 있어요. 아이 코드를 아는 사람은 오늘 할 일 체크만
        할 수 있어요.
      </p>

      <div className="rounded-xl bg-amber-50 p-3 text-center">
        <p className="text-sm text-black/50">아이 코드</p>
        <p className="break-all text-3xl tracking-widest">{kid.view_token}</p>
        {short && <p className="mt-1 text-sm text-black/50">앱 첫 화면에서 이 코드만 입력해도 돼요</p>}
      </div>

      {qr && (
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="아이 링크 QR 코드" width={160} height={160} className="rounded-xl border" />
          <p className="text-sm text-black/50">아이 폰 카메라로 비추면 바로 열려요</p>
        </div>
      )}

      <p className="break-all rounded-xl bg-slate-50 p-2 text-sm">{link}</p>
      <button onClick={copy} className="w-full rounded-xl bg-amber-300 py-2">
        {copied ? "복사됐어요 ✔" : "링크 복사"}
      </button>

      <div className="space-y-2 border-t pt-3">
        <p className="text-base">코드 바꾸기</p>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
            placeholder="직접 정하기 (영문/숫자 6자 이상)"
            autoCapitalize="none"
            className="min-w-0 flex-1 rounded-xl border-2 border-amber-200 px-3 py-2"
          />
          <button onClick={() => setCode(custom)} disabled={!custom} className="rounded-xl bg-amber-400 px-4 disabled:opacity-40">
            저장
          </button>
        </div>
        <button onClick={() => setCode(randomCode())} className="w-full rounded-xl bg-rose-100 py-2">
          🎲 짧은 코드 새로 만들기 (6자)
        </button>
        <p className="text-sm text-black/50">너무 쉬운 코드(예: 이름, 123456)는 다른 사람이 맞힐 수 있어요.</p>
      </div>
      {err && <p className="text-base text-rose-600">{err}</p>}
    </section>
  );
}
