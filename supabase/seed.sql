-- 사전 준비: Supabase 대시보드 → Authentication → Users → "Add user (Create new user)"
--   mom@sticker.example.com / dad@sticker.example.com  (비밀번호는 직접 정하고, Auto Confirm User 체크)
--   * 로그인 화면에서는 "mom" / "dad" 아이디만 입력합니다.
--   * 도메인을 바꾸려면 .env.local 의 NEXT_PUBLIC_AUTH_DOMAIN 과 아래 두 줄을 같이 바꾸세요.
-- 아이 이름/아바타는 아래에서 바꿔서 실행하세요.

do $$
declare
  fam uuid;
  kid uuid;
  mom_id uuid := (select id from auth.users where email = 'mom@sticker.example.com');
  dad_id uuid := (select id from auth.users where email = 'dad@sticker.example.com');
begin
  if mom_id is null or dad_id is null then
    raise exception 'mom / dad 사용자를 먼저 대시보드에서 만들어 주세요';
  end if;

  insert into families (name) values ('우리 가족') returning id into fam;

  insert into profiles (id, family_id, role, display_name) values
    (mom_id, fam, 'mom', '엄마'),
    (dad_id, fam, 'dad', '아빠');

  insert into kids (family_id, name, avatar) values (fam, '우리 아이', '🐻') returning id into kid;

  insert into routines (kid_id, title, icon, sort_order) values
    (kid, '양치하기', '🪥', 1),
    (kid, '책 읽기', '📚', 2),
    (kid, '장난감 정리', '🧸', 3);
end $$;
