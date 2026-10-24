import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** 서버 전용: service_role 키로 사용자 생성 등 관리 작업을 함. 브라우저로 절대 내보내지 않음. */
export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("서버에 SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았어요.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
