import { randomBytes, timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase-admin";

/**
 * 최초 설정 전용 API.
 * - ADMIN 로그인(기본 비밀번호 1234, SETUP_ADMIN_PASSWORD 로 변경 가능)으로만 접근
 * - 부모 계정(profiles)이 하나라도 생기면 영구 비활성화
 */

const ADMIN_ID = "admin";
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_AUTH_DOMAIN ?? "sticker.example.com";
const ID_RE = /^[a-z0-9._-]{2,20}$/;

const MAX_FAILS = 5;
const BLOCK_MS = 15 * 60 * 1000;
const fails = new Map<string, { n: number; until: number }>();

// 아이가 입력하기 쉬운 짧은 코드 (헷갈리는 글자 제외)
const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const shortCode = (len = 6) =>
  Array.from(randomBytes(len), (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function checkAdmin(ip: string, id: unknown, pw: unknown): string | null {
  const f = fails.get(ip);
  if (f && f.until > Date.now() && f.n >= MAX_FAILS) return "시도가 너무 많아요. 잠시 후 다시 해 주세요.";
  const expected = process.env.SETUP_ADMIN_PASSWORD || "1234";
  const ok =
    typeof id === "string" &&
    typeof pw === "string" &&
    id.trim().toLowerCase() === ADMIN_ID &&
    safeEqual(pw, expected);
  if (!ok) {
    const n = (f && f.until > Date.now() ? f.n : 0) + 1;
    fails.set(ip, { n, until: Date.now() + BLOCK_MS });
    return "ADMIN 아이디 또는 비밀번호가 맞지 않아요.";
  }
  fails.delete(ip);
  return null;
}

async function isOpen() {
  const sb = getAdminClient();
  const { count, error } = await sb.from("profiles").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return (count ?? 0) === 0;
}

interface Parent {
  id?: string;
  password?: string;
}

function validParent(p: Parent | undefined, label: string): string | null {
  const id = p?.id?.trim().toLowerCase() ?? "";
  if (!ID_RE.test(id)) return `${label} 아이디는 영문 소문자/숫자 2~20자로 입력해 주세요.`;
  if ((p?.password ?? "").length < 6) return `${label} 비밀번호는 6자 이상이어야 해요.`;
  return null;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청이에요." }, 400);
  }

  try {
    if (body.action === "status") {
      return json({ open: await isOpen() });
    }

    if (!(await isOpen())) {
      return json({ error: "이미 설정이 끝났어요. 부모 로그인을 사용해 주세요." }, 403);
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const adminErr = checkAdmin(ip, body.adminId, body.adminPassword);
    if (adminErr) return json({ error: adminErr }, 401);

    if (body.action === "login") return json({ ok: true });
    if (body.action !== "create") return json({ error: "알 수 없는 요청이에요." }, 400);

    const mom = body.mom as Parent | undefined;
    const dad = body.dad as Parent | undefined;
    const kidName = typeof body.kidName === "string" ? body.kidName.trim() : "";
    const err = validParent(mom, "엄마") ?? validParent(dad, "아빠");
    if (err) return json({ error: err }, 400);
    if (mom!.id!.trim().toLowerCase() === dad!.id!.trim().toLowerCase())
      return json({ error: "엄마와 아빠의 아이디가 같을 수 없어요." }, 400);
    if (!kidName || kidName.length > 20) return json({ error: "아이 이름을 20자 이내로 입력해 주세요." }, 400);

    const sb = getAdminClient();
    const created: string[] = [];
    let familyId: string | null = null;
    const rollback = async () => {
      if (familyId) await sb.from("families").delete().eq("id", familyId);
      for (const uid of created) await sb.auth.admin.deleteUser(uid);
    };

    try {
      const make = async (p: Parent) => {
        const { data, error } = await sb.auth.admin.createUser({
          email: `${p.id!.trim().toLowerCase()}@${AUTH_DOMAIN}`,
          password: p.password!,
          email_confirm: true,
        });
        if (error || !data.user) throw new Error(error?.message ?? "계정을 만들지 못했어요.");
        created.push(data.user.id);
        return data.user.id;
      };
      const momId = await make(mom!);
      const dadId = await make(dad!);

      const fam = await sb.from("families").insert({ name: "우리 가족" }).select("id").single();
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
      const msg = e instanceof Error ? e.message : "설정에 실패했어요.";
      return json({ error: /already|registered|exists/i.test(msg) ? "이미 사용 중인 아이디예요." : msg }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "서버 오류가 발생했어요." }, 500);
  }
}
