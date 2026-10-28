-- Run once in Supabase SQL Editor. Enable Anonymous Sign-ins in Authentication > Providers.
create table if not exists public.restaurants (
 id bigint generated always as identity primary key,
 category text not null check (char_length(category) between 1 and 50),
 name text not null unique check (char_length(name) between 1 and 120),
 created_at timestamptz not null default now()
);
create table if not exists public.votes (
 id bigint generated always as identity primary key,
 restaurant_id bigint not null references public.restaurants(id) on delete cascade,
 voter_id uuid not null references auth.users(id) on delete cascade,
 vote_day date not null default ((now() at time zone 'Asia/Seoul')::date),
 created_at timestamptz not null default now(),
 unique(voter_id, vote_day)
);
create table if not exists public.draws (
 id bigint generated always as identity primary key,
 restaurant_id bigint references public.restaurants(id) on delete set null,
 draw_day date not null default ((now() at time zone 'Asia/Seoul')::date),
 created_at timestamptz not null default now()
);
grant usage on schema public to authenticated;
grant select, insert, delete on public.restaurants to authenticated;
grant select, insert, update, delete on public.votes to authenticated;
grant select, insert on public.draws to authenticated;
grant usage, select on all sequences in schema public to authenticated;
create index if not exists votes_day_idx on public.votes(vote_day);
create index if not exists draws_day_idx on public.draws(draw_day,created_at desc);
alter table public.restaurants enable row level security;
alter table public.votes enable row level security;
alter table public.draws enable row level security;
create policy "team read restaurants" on public.restaurants for select to authenticated using (true);
create policy "team add restaurants" on public.restaurants for insert to authenticated with check (true);
create policy "team delete restaurants" on public.restaurants for delete to authenticated using (true);
create policy "team read votes" on public.votes for select to authenticated using (true);
create policy "team vote" on public.votes for insert to authenticated with check (voter_id = (select auth.uid()) and vote_day = ((now() at time zone 'Asia/Seoul')::date));
create policy "team change own vote" on public.votes for update to authenticated using (voter_id=(select auth.uid())) with check (voter_id=(select auth.uid()) and vote_day=((now() at time zone 'Asia/Seoul')::date));
create policy "team withdraw own vote" on public.votes for delete to authenticated using (voter_id=(select auth.uid()));
create policy "team read draws" on public.draws for select to authenticated using (true);
create policy "team create draws" on public.draws for insert to authenticated with check (draw_day=((now() at time zone 'Asia/Seoul')::date));
insert into public.restaurants(category,name) values
('낙곱새','찐 낙곱새 곱도리탕'),
('김치찌개','지리산'),('김치찌개','세화정육식당 강남구청역본점'),
('칼국수','명동 칼국수'),('칼국수','덕수궁해물칼국수'),
('중식','중화백반 강남구청점'),('중식','공리'),('중식','짬뽕지존 (매운맛 단계 선택)'),
('돈가스','혼돈'),('돈가스','카이카츠 논현점'),('돈가스','백소정'),
('족발','팔당족발'),('보쌈','고향집'),('소바','아부라소바'),('햄버거','맥도날드'),
('제육','이층고깃집'),('순두부','북창동순두부 강남구청점'),('쌀국수','포인비에트'),
('샤브샤브','등촌샤브칼국수 강남구청역점'),
('피자','파파존스 논현점'),('피자','서오릉피자 강남논현점'),
('탕·냉면','대가연 강남본점'),('탕·냉면','향동가 (냉면, 곰탕)')
on conflict(name) do nothing;
-- Realtime subscription for all three tables (repeat-safe).
do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='restaurants') then
  alter publication supabase_realtime add table public.restaurants;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='votes') then
  alter publication supabase_realtime add table public.votes;
 end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='draws') then
  alter publication supabase_realtime add table public.draws;
 end if;
end $$;
