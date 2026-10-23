# 🌟 스티커 친구

아이가 매일 루틴을 체크하면 부모(엄마/아빠)가 승인해 스티커를 주고, 30개를 모으면 장난감 쿠폰이 생기는 서비스.
전체 기획은 [SPEC.md](SPEC.md) 참고.

## 로컬 실행

```bash
npm install
npm run dev
```

- http://localhost:3000/kid/demo — **데모 모드** (Supabase 없이 아이 화면/애니메이션 체험, 데모 도구 버튼 포함)
- http://localhost:3000/parent — 부모 로그인 (Supabase 연결 필요)

## Supabase 연결 (실서비스)

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. **SQL Editor**에서 [supabase/schema.sql](supabase/schema.sql) 실행
3. **Authentication → Users → Add user → Create new user** 로 두 명 생성 (Auto Confirm User 체크, 비밀번호는 직접 정하기)
   - `mom@sticker.example.com`
   - `dad@sticker.example.com`
4. SQL Editor에서 [supabase/seed.sql](supabase/seed.sql) 실행 (가족/아이/기본 루틴 생성 — 아이 이름은 파일에서 수정)
5. `.env.example`을 `.env.local`로 복사하고 Project Settings → API 의 값을 입력
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 로그인 화면에서 아이디 `mom` / `dad` + 정한 비밀번호로 로그인
7. 부모 화면 **설정 → 아이 전용 링크**를 아이 폰으로 보내 “홈 화면에 추가”

## 배포 (Vercel)

GitHub 저장소를 Vercel에 연결하고 환경변수 3개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_AUTH_DOMAIN`)를 등록하면 push마다 자동 배포됩니다.

## 구조

- `src/components/kid/*` — 아이 화면 (토글, 대기, 스티커판, 쿠폰, 축하 연출)
- `src/components/parent/*` — 부모 화면 (승인함, 루틴, 쿠폰, 설정)
- `src/lib/kid-api.ts` — 아이 링크용 API (실서비스 RPC + 데모 구현)
- `supabase/schema.sql` — 테이블, RLS, 승인/토글 RPC

## 보안 메모

- 아이 링크(토큰)로는 `kid_view` / `kid_toggle` / `kid_pick_theme` RPC만 호출됩니다. 테이블 직접 접근은 RLS로 막혀 있습니다.
- 스티커 발급은 로그인한 부모의 `approve_submission` RPC로만 가능합니다.
