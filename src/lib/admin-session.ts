import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "sp_admin";
const TTL_SECONDS = 8 * 60 * 60;

/** ADMIN 비밀번호: ADMIN_PASSWORD → (이전 이름) SETUP_ADMIN_PASSWORD → 1234 */
export const adminPassword = () =>
  process.env.ADMIN_PASSWORD || process.env.SETUP_ADMIN_PASSWORD || "1234";

// 서명 키에 ADMIN 비밀번호를 섞어서, 비밀번호를 바꾸면 기존 세션이 모두 무효가 되게 함
const key = () =>
  `${process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""}|${adminPassword()}`;

const sign = (exp: string) => createHmac("sha256", key()).update(`admin|${exp}`).digest("hex");

export async function issueAdminSession() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(COOKIE);
}

export async function hasAdminSession(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
