import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  adminPassword,
  clearAdminSession,
  hasAdminSession,
  issueAdminSession,
} from "@/lib/admin-session";
import { getAdminClient } from "@/lib/supabase-admin";

/**
 * ADMIN 전용 API (모든 가족 관리).
 * - ADMIN 로그인 후 서명된 httpOnly 쿠키로 인증
 * - 모든 작업은 서버에서 service_role 로 실행
 */

const MAX_FAMILIES = 5;
const ADMIN_ID = "admin";
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_AUTH_DOMAIN ?? "sticker.example.com";
const ID_RE = /^[a-z0-9._-]{2,20}$/;

const MAX_FAILS = 5;
const BLOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { n: number; until: number }>();

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const shortCode = (len = 6) =>
  Array.from(randomBytes(len), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const fail = (error: string, status = 400) => json({ error }, status);

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function checkLogin(ip: string, id: unknown, pw: unknown): string | null {
  const f = fails.get(ip);
  if (f && f.until > Date.now() && f.n >= MAX_FAILS) return "시도가 너무 많아요. 잠시 후 다시 해 주세요.";
  const ok =
    typeof id === "string" &&
    typeof pw === "string" &&
    id.trim().toLowerCase() === ADMIN_ID &&
    safeEqual(pw, adminPassword());
  if (!ok) {
    const n = (f && f.until > Date.now() ? f.n : 0) + 1;
    fails.set(ip, { n, until: Date.now() + BLOCK_MS });
    return "ADMIN 아이디 또는 비밀번호가 맞지 않아요.";
  }
  fails.delete(ip);
  return null;
}

interface Parent {
  id?: string;
  password?: string;
}

const norm = (p?: Parent) => p?.id?.trim().toLowerCase() ?? "";

function validParent(p: Parent | undefined, label: string): string | null {
  if (!ID_RE.test(norm(p))) return `${label} 아이디는 영문 소문자/숫자 2~20자로 입력해 주세요.`;
  if ((p?.password ?? "").length < 6) return `${label} 비밀번호는 6자 이상이어야 해요.`;
  return null;
}

const friendly = (msg: string) => {
  if (/family limit/i.test(msg)) return `가족은 최대 ${MAX_FAMILIES}개까지 만들 수 있어요.`;
  if (/already|registered|exists|duplicate/i.test(msg)) return "이미 사용 중인 아이디예요.";
  return msg;
};

async function listFamilies() {
  const sb = getAdminClient();
  const [fam, prof, kids, stk, users] = await Promise.all([
    sb.from("families").select("id, name, created_at").order("created_at"),
    sb.from("profiles").select("id, family_id, role"),
    sb.from("kids").select("id, family_id, name, avatar, view_token").order("created_at"),
    sb.from("stickers").select("kid_id"),
    sb.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  for (const r of [fam, prof, kids, stk]) if (r.error) throw new Error(r.error.message);
  if (users.error) throw new Error(users.error.message);

  const loginId = new Map(
    users.data.users.map((u) => [u.id, (u.email ?? "").split("@")[0]] as const),
  );
  const stickersByKid = new Map<string, number>();
  for (const s of stk.data ?? []) stickersByKid.set(s.kid_id, (stickersByKid.get(s.kid_id) ?? 0) + 1);

  return (fam.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    parents: (prof.data ?? [])
      .filter((p) => p.family_id === f.id)
      .map((p) => ({ id: p.id, role: p.role, loginId: loginId.get(p.id) ?? "" })),
    kids: (kids.data ?? [])
      .filter((k) => k.family_id === f.id)
      .map((k) => ({
        id: k.id,
        name: k.name,
        avatar: k.avatar,
        code: k.view_token,
        stickers: stickersByKid.get(k.id) ?? 0,
      })),
  }));
}

async function createFamily(body: Record<string, unknown>) {
  const mom = body.mom as Parent | undefined;
  const dad = body.dad as Parent | undefined;
  const kidName = typeof body.kidName === "string" ? body.kidName.trim() : "";
  const familyName = typeof body.familyName === "string" && body.familyName.trim() ? body.familyName.trim() : "우리 가족";

  const err = validParent(mom, "엄마") ?? validParent(dad, "아빠");
  if (err) return fail(err);
  if (norm(mom) === norm(dad)) return fail("엄마와 아빠의 아이디가 같을 수 없어요.");
  if (!kidName || kidName.length > 20) return fail("아이 이름을 20자 이내로 입력해 주세요.");
  if (familyName.length > 30) return fail("가족 이름은 30자 이내로 입력해 주세요.");

  const sb = getAdminClient();
  const { count } = await sb.from("families").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_FAMILIES) return fail(`가족은 최대 ${MAX_FAMILIES}개까지 만들 수 있어요.`);

  const created: string[] = [];
  let familyId: string | null = null;
  const rollback = async () => {
    if (familyId) await sb.from("families").delete().eq("id", familyId);
    for (const uid of created) await sb.auth.admin.deleteUser(uid);
  };

  try {
    const make = async (p: Parent) => {
      const { data, error } = await sb.auth.admin.createUser({
        email: `${norm(p)}@${AUTH_DOMAIN}`,
        password: p.password!,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(error?.message ?? "계정을 만들지 못했어요.");
      created.push(data.user.id);
      return data.user.id;
    };
    const momId = await make(mom!);
    const dadId = await make(dad!);

    const fam = await sb.from("families").insert({ name: familyName }).select("id").single();
    if (fam.error) throw new Error(fam.error.message);
    familyId = fam.data.id;

    const prof = await sb.from("profiles").insert([
      { id: momId, family_id: familyId, role: "mom", display_name: "엄마" },
      { id: dadId, family_id: familyId, role: "dad", display_name: "아빠" },
    ]);
    if (prof.error) throw new Error(prof.error.message);

    const kid = await sb
      .from("kids")
      .insert({ family_id: familyId, name: kidName, avatar: "🐻", view_token: shortCode() })
      .select("id")
      .single();
    if (kid.error) throw new Error(kid.error.message);

    const rt = await sb.from("routines").insert([
      { kid_id: kid.data.id, title: "양치하기", icon: "🪥", sort_order: 1 },
      { kid_id: kid.data.id, title: "책 읽기", icon: "📚", sort_order: 2 },
      { kid_id: kid.data.id, title: "장난감 정리", icon: "🧸", sort_order: 3 },
    ]);
    if (rt.error) throw new Error(rt.error.message);
  } catch (e) {
    await rollback();
    return fail(friendly(e instanceof Error ? e.message : "가족을 만들지 못했어요."), 500);
  }
  return json({ ok: true });
}

async function deleteFamily(body: Record<string, unknown>) {
  const familyId = typeof body.familyId === "string" ? body.familyId : "";
  const confirmName = typeof body.confirmName === "string" ? body.confirmName.trim() : "";
  const sb = getAdminClient();

  const fam = await sb.from("families").select("id, name").eq("id", familyId).maybeSingle();
  if (!fam.data) return fail("가족을 찾을 수 없어요.", 404);
  if (confirmName !== fam.data.name) return fail("가족 이름이 맞지 않아 삭제하지 않았어요.");

  const prof = await sb.from("profiles").select("id").eq("family_id", familyId);
  const userIds = (prof.data ?? []).map((p) => p.id as string);

  // 가족을 먼저 지우면 아이/루틴/스티커/쿠폰/프로필이 함께 삭제됨
  const del = await sb.from("families").delete().eq("id", familyId);
  if (del.error) return fail(del.error.message, 500);
  for (const uid of userIds) await sb.auth.admin.deleteUser(uid);
  return json({ ok: true });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("잘못된 요청이에요.");
  }

  try {
    if (body.action === "login") {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      const err = checkLogin(ip, body.adminId, body.adminPassword);
      if (err) return fail(err, 401);
      await issueAdminSession();
      return json({ ok: true });
    }
    if (body.action === "logout") {
      await clearAdminSession();
      return json({ ok: true });
    }

    if (!(await hasAdminSession())) return fail("관리자 로그인이 필요해요.", 401);

    switch (body.action) {
      case "me":
        return json({ ok: true, max: MAX_FAMILIES, weakPassword: adminPassword() === "1234" });
      case "list":
        return json({ families: await listFamilies(), max: MAX_FAMILIES });
      case "createFamily":
        return await createFamily(body);
      case "deleteFamily":
        return await deleteFamily(body);
      case "renameFamily": {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name || name.length > 30) return fail("가족 이름을 30자 이내로 입력해 주세요.");
        const { error } = await getAdminClient()
          .from("families")
          .update({ name })
          .eq("id", String(body.familyId ?? ""));
        return error ? fail(error.message, 500) : json({ ok: true });
      }
      case "resetPassword": {
        const password = typeof body.password === "string" ? body.password : "";
        if (password.length < 6) return fail("비밀번호는 6자 이상이어야 해요.");
        const userId = String(body.userId ?? "");
        const sb = getAdminClient();
        // 부모 계정만 허용
        const p = await sb.from("profiles").select("id").eq("id", userId).maybeSingle();
        if (!p.data) return fail("부모 계정을 찾을 수 없어요.", 404);
        const { error } = await sb.auth.admin.updateUserById(userId, { password });
        return error ? fail(error.message, 500) : json({ ok: true });
      }
      default:
        return fail("알 수 없는 요청이에요.");
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "서버 오류가 발생했어요.", 500);
  }
}
