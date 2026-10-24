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

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성 (GitHub 로그인 가능)
2. **SQL Editor**에서 [supabase/schema.sql](supabase/schema.sql) 실행
3. **Project Settings → API**에서 값을 복사해 `.env.example`을 `.env.local`로 복사한 뒤 입력
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role / secret 키, **서버 전용·절대 공개 금지**)
4. `npm run dev` 후 http://localhost:3000/setup 에서 **ADMIN / 1234** 로 로그인 → 엄마·아빠 아이디/비밀번호와 아이 이름 입력 → 시작하기
   - 설정이 끝나면 `/setup`은 자동으로 닫힙니다 (부모 계정이 하나라도 있으면 비활성화).
   - 인터넷에 배포할 때는 `SETUP_ADMIN_PASSWORD`로 ADMIN 비밀번호를 바꾸고, 배포 직후 바로 설정을 끝내세요.
5. http://localhost:3000/parent 에서 방금 만든 아이디/비밀번호로 로그인
6. 부모 화면 **설정 → 아이 전용 링크**를 아이 폰으로 보내 “홈 화면에 추가”

## 배포 (Vercel)

GitHub 저장소를 Vercel에 연결하고 환경변수(`.env.example`의 항목들, `SUPABASE_SERVICE_ROLE_KEY`와 `SETUP_ADMIN_PASSWORD` 포함)를 등록하면 push마다 자동 배포됩니다.

## 구조

- `src/components/kid/*` — 아이 화면 (토글, 대기, 스티커판, 쿠폰, 축하 연출)
- `src/components/parent/*` — 부모 화면 (승인함, 루틴, 쿠폰, 설정)
- `src/lib/kid-api.ts` — 아이 링크용 API (실서비스 RPC + 데모 구현)
- `supabase/schema.sql` — 테이블, RLS, 승인/토글 RPC
- `src/app/api/setup/route.ts` — 최초 설정(ADMIN) API

## 보안 메모

- 아이 링크(토큰)로는 `kid_view` / `kid_toggle` / `kid_pick_theme` RPC만 호출됩니다. 테이블 직접 접근은 RLS로 막혀 있습니다.
- 스티커 발급은 로그인한 부모의 `approve_submission` RPC로만 가능합니다.
