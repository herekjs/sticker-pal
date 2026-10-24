-- 스티커 친구: Supabase 스키마 (SQL Editor에서 한 번 실행)
-- 순서: schema.sql → (대시보드에서 mom/dad 사용자 생성) → seed.sql

create extension if not exists pgcrypto;

-- ───────── 테이블 ─────────
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가족',
  timezone text not null default 'Asia/Seoul',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  role text not null check (role in ('mom', 'dad')),
  display_name text not null
);

create table if not exists themes (
  id text primary key,
  name text not null,
  emoji text not null,
  color text not null,
  sort_order int not null default 0
);

create table if not exists kids (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  avatar text not null default '🐻',
  view_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  current_board_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists boards (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  theme_id text not null references themes(id),
  size int not null default 30,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table kids
  drop constraint if exists kids_current_board_fk,
  add constraint kids_current_board_fk foreign key (current_board_id) references boards(id) on delete set null;

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  title text not null,
  icon text not null default '⭐',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists daily_checks (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  routine_id uuid not null references routines(id) on delete cascade,
  date date not null,
  done boolean not null default false,
  checked_at timestamptz not null default now(),
  unique (routine_id, date)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz not null default now(),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  reject_note text
);
create unique index if not exists submissions_one_open_per_day
  on submissions (kid_id, date) where status in ('pending', 'approved');

create table if not exists stickers (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  date date not null,
  slot_no int not null,
  awarded_by uuid references profiles(id),
  kind text not null default 'routine' check (kind in ('routine', 'bonus')),
  note text,                      -- 보너스 스티커 한마디
  value_amount numeric,           -- 나중에 "스티커당 금액" 기능용
  created_at timestamptz not null default now(),
  unique (board_id, slot_no)
);
-- 이미 예전 스키마를 실행한 DB도 안전하게 올라가도록 (재실행 가능)
alter table stickers add column if not exists kind text not null default 'routine';
alter table stickers add column if not exists note text;
alter table stickers drop constraint if exists stickers_kid_id_date_key;
-- 루틴 스티커는 하루 1개, 보너스 스티커는 제한 없음
create unique index if not exists stickers_one_routine_per_day
  on stickers (kid_id, date) where kind = 'routine';

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  board_id uuid references boards(id) on delete set null,
  title text not null default '장난감 1개',
  value_amount numeric,
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references profiles(id)
);

-- ───────── 헬퍼 ─────────
create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from profiles where id = auth.uid()
$$;

create or replace function public.family_today(p_family uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone timezone)::date from families where id = p_family
$$;

-- ───────── RLS: 부모(로그인)만 직접 접근 ─────────
alter table families enable row level security;
alter table profiles enable row level security;
alter table themes enable row level security;
alter table kids enable row level security;
alter table boards enable row level security;
alter table routines enable row level security;
alter table daily_checks enable row level security;
alter table submissions enable row level security;
alter table stickers enable row level security;
alter table coupons enable row level security;

drop policy if exists "family read" on families;
create policy "family read" on families for select using (id = my_family());

drop policy if exists "profiles read" on profiles;
create policy "profiles read" on profiles for select using (family_id = my_family());

drop policy if exists "themes read" on themes;
create policy "themes read" on themes for select using (true);

drop policy if exists "kids read" on kids;
create policy "kids read" on kids for select using (family_id = my_family());
drop policy if exists "kids update" on kids;
create policy "kids update" on kids for update using (family_id = my_family()) with check (family_id = my_family());

drop policy if exists "boards read" on boards;
create policy "boards read" on boards for select
  using (kid_id in (select id from kids where family_id = my_family()));

drop policy if exists "routines all" on routines;
create policy "routines all" on routines for all
  using (kid_id in (select id from kids where family_id = my_family()))
  with check (kid_id in (select id from kids where family_id = my_family()));

drop policy if exists "checks read" on daily_checks;
create policy "checks read" on daily_checks for select
  using (kid_id in (select id from kids where family_id = my_family()));

drop policy if exists "submissions read" on submissions;
create policy "submissions read" on submissions for select
  using (kid_id in (select id from kids where family_id = my_family()));

drop policy if exists "stickers read" on stickers;
create policy "stickers read" on stickers for select
  using (kid_id in (select id from kids where family_id = my_family()));

drop policy if exists "coupons read" on coupons;
create policy "coupons read" on coupons for select
  using (kid_id in (select id from kids where family_id = my_family()));
drop policy if exists "coupons use" on coupons;
create policy "coupons use" on coupons for update
  using (kid_id in (select id from kids where family_id = my_family()))
  with check (kid_id in (select id from kids where family_id = my_family()));

-- 스티커/승인요청/토글은 아래 RPC(security definer)로만 변경됨 (직접 쓰기 정책 없음)

-- ───────── 아이 전용 RPC (토큰으로 호출, 로그인 없음) ─────────
create or replace function public.kid_view(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kids; d date;
begin
  select * into k from kids where view_token = p_token;
  if not found then raise exception 'invalid link'; end if;
  d := family_today(k.family_id);

  return jsonb_build_object(
    'kid', jsonb_build_object('name', k.name, 'avatar', k.avatar),
    'today', d,
    'routines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'icon', r.icon, 'done', coalesce(c.done, false)
      ) order by r.sort_order, r.created_at)
      from routines r
      left join daily_checks c on c.routine_id = r.id and c.date = d
      where r.kid_id = k.id and r.is_active
    ), '[]'::jsonb),
    'submission', (
      select jsonb_build_object('status', s.status, 'reject_note', s.reject_note)
      from submissions s where s.kid_id = k.id and s.date = d
      order by s.submitted_at desc limit 1
    ),
    'waiting_days', (select count(*) from submissions where kid_id = k.id and status = 'pending'),
    'board', (
      select jsonb_build_object('id', b.id, 'theme_id', b.theme_id, 'size', b.size)
      from boards b where b.id = k.current_board_id
    ),
    'stickers', coalesce((
      select jsonb_agg(jsonb_build_object('slot_no', s.slot_no, 'date', s.date, 'role', p.role,
                                          'kind', s.kind, 'note', s.note)
        order by s.slot_no)
      from stickers s left join profiles p on p.id = s.awarded_by
      where s.board_id = k.current_board_id
    ), '[]'::jsonb),
    'coupons', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'issued_at', c.issued_at, 'used_at', c.used_at
      ) order by c.issued_at desc)
      from coupons c where c.kid_id = k.id
    ), '[]'::jsonb),
    'themes', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order) from themes t), '[]'::jsonb)
  );
end $$;

create or replace function public.kid_toggle(p_token text, p_routine uuid, p_done boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kids; d date; total int; done_n int;
begin
  select * into k from kids where view_token = p_token;
  if not found then raise exception 'invalid link'; end if;
  d := family_today(k.family_id);

  if exists (select 1 from submissions
             where kid_id = k.id and date = d and status in ('pending', 'approved')) then
    raise exception 'locked';
  end if;
  if not exists (select 1 from routines where id = p_routine and kid_id = k.id and is_active) then
    raise exception 'unknown routine';
  end if;

  insert into daily_checks (kid_id, routine_id, date, done)
  values (k.id, p_routine, d, p_done)
  on conflict (routine_id, date) do update set done = excluded.done, checked_at = now();

  select count(*) into total from routines where kid_id = k.id and is_active;
  select count(*) into done_n
    from routines r join daily_checks c on c.routine_id = r.id and c.date = d and c.done
    where r.kid_id = k.id and r.is_active;

  if total > 0 and done_n = total then
    insert into submissions (kid_id, date) values (k.id, d) on conflict do nothing;
  end if;

  return kid_view(p_token);
end $$;

create or replace function public.kid_pick_theme(p_token text, p_theme text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k kids; b boards; new_id uuid;
begin
  select * into k from kids where view_token = p_token;
  if not found then raise exception 'invalid link'; end if;
  if not exists (select 1 from themes where id = p_theme) then raise exception 'unknown theme'; end if;

  if k.current_board_id is not null then
    select * into b from boards where id = k.current_board_id;
    if exists (select 1 from stickers where board_id = b.id) then
      raise exception 'board in progress';
    end if;
    update boards set theme_id = p_theme where id = b.id;
  else
    insert into boards (kid_id, theme_id) values (k.id, p_theme) returning id into new_id;
    update kids set current_board_id = new_id where id = k.id;
  end if;
  return kid_view(p_token);
end $$;

-- ───────── 부모 전용 RPC (로그인 필요) ─────────
create or replace function public.approve_submission(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles; s submissions; k kids; b boards; cnt int; sl int;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'not a parent'; end if;
  select * into s from submissions where id = p_id for update;
  if not found then raise exception 'unknown request'; end if;
  select * into k from kids where id = s.kid_id;
  if k.family_id <> me.family_id then raise exception 'not your family'; end if;
  if s.status <> 'pending' then raise exception 'already decided'; end if;
  if k.current_board_id is null then raise exception 'theme not chosen'; end if;

  select * into b from boards where id = k.current_board_id;
  select count(*) into cnt from stickers where board_id = b.id;
  sl := cnt + 1;

  insert into stickers (kid_id, board_id, date, slot_no, awarded_by)
  values (k.id, b.id, s.date, sl, me.id);
  update submissions set status = 'approved', decided_by = me.id, decided_at = now() where id = p_id;

  if sl >= b.size then
    update boards set completed_at = now() where id = b.id;
    update kids set current_board_id = null where id = k.id;
    insert into coupons (kid_id, board_id) values (k.id, b.id);
  end if;
  return jsonb_build_object('slot_no', sl, 'coupon', sl >= b.size);
end $$;

-- 부모가 아이의 요청 없이 직접 주는 보너스 스티커
create or replace function public.give_bonus_sticker(p_kid uuid, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles; k kids; b boards; cnt int; sl int;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'not a parent'; end if;
  select * into k from kids where id = p_kid for update;
  if not found or k.family_id <> me.family_id then raise exception 'not your family'; end if;
  if k.current_board_id is null then raise exception 'theme not chosen'; end if;

  select * into b from boards where id = k.current_board_id;
  select count(*) into cnt from stickers where board_id = b.id;
  sl := cnt + 1;

  insert into stickers (kid_id, board_id, date, slot_no, awarded_by, kind, note)
  values (k.id, b.id, family_today(k.family_id), sl, me.id, 'bonus', nullif(trim(p_note), ''));

  if sl >= b.size then
    update boards set completed_at = now() where id = b.id;
    update kids set current_board_id = null where id = k.id;
    insert into coupons (kid_id, board_id) values (k.id, b.id);
  end if;
  return jsonb_build_object('slot_no', sl, 'coupon', sl >= b.size);
end $$;

create or replace function public.reject_submission(p_id uuid, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; s submissions; k kids;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'not a parent'; end if;
  select * into s from submissions where id = p_id for update;
  if not found then raise exception 'unknown request'; end if;
  select * into k from kids where id = s.kid_id;
  if k.family_id <> me.family_id then raise exception 'not your family'; end if;
  if s.status <> 'pending' then raise exception 'already decided'; end if;

  update submissions
    set status = 'rejected', decided_by = me.id, decided_at = now(), reject_note = nullif(trim(p_note), '')
    where id = p_id;
  -- 다시 할 수 있도록 그날 체크를 초기화
  update daily_checks set done = false where kid_id = s.kid_id and date = s.date;
end $$;

-- ───────── 실행 권한 ─────────
revoke all on function public.kid_view(text) from public;
revoke all on function public.kid_toggle(text, uuid, boolean) from public;
revoke all on function public.kid_pick_theme(text, text) from public;
revoke all on function public.approve_submission(uuid) from public;
revoke all on function public.reject_submission(uuid, text) from public;
revoke all on function public.give_bonus_sticker(uuid, text) from public;
grant execute on function public.give_bonus_sticker(uuid, text) to authenticated;

grant execute on function public.kid_view(text) to anon, authenticated;
grant execute on function public.kid_toggle(text, uuid, boolean) to anon, authenticated;
grant execute on function public.kid_pick_theme(text, text) to anon, authenticated;
grant execute on function public.approve_submission(uuid) to authenticated;
grant execute on function public.reject_submission(uuid, text) to authenticated;
grant execute on function public.my_family() to authenticated;

-- ───────── 테마 시드 ─────────
insert into themes (id, name, emoji, color, sort_order) values
  ('dino',    '공룡',     '🦖', '#86efac', 1),
  ('space',   '우주',     '🚀', '#a5b4fc', 2),
  ('animals', '동물친구', '🐱', '#fcd34d', 3),
  ('dessert', '디저트',   '🧁', '#f9a8d4', 4),
  ('car',     '자동차',   '🚗', '#fca5a5', 5),
  ('unicorn', '유니콘',   '🦄', '#d8b4fe', 6)
on conflict (id) do nothing;
