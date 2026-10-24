import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && key);

/** 부모 로그인 아이디(mom/dad)를 Supabase Auth 이메일로 매핑 */
export const AUTH_DOMAIN = process.env.NEXT_PUBLIC_AUTH_DOMAIN ?? "sticker.example.com";
export const idToEmail = (id: string) => {
  const v = id.trim().toLowerCase();
  // 전체 이메일을 입력하면 그대로, 앞부분(아이디)만 입력하면 도메인을 붙임
  return v.includes("@") ? v : `${v}@${AUTH_DOMAIN}`;
};

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error("Supabase 환경변수(.env.local)가 설정되지 않았어요.");
  }
  return (client ??= createClient(url, key));
}
