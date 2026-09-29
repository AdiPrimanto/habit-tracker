create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 100),
  days smallint[] not null default '{0,1,2,3,4,5,6}'   -- 0=Minggu..6=Sabtu
    check (cardinality(days) between 1 and 7 and days <@ '{0,1,2,3,4,5,6}'),
  position integer not null default 0,
  archived_at timestamptz,                              -- null = aktif
  created_at timestamptz not null default now()
);
create index on habits (user_id, position);

create table checkins (
  habit_id uuid not null references habits on delete cascade,
  day date not null,
  note text check (note is null or length(note) <= 280),
  primary key (habit_id, day)
);

alter table habits enable row level security;
alter table checkins enable row level security;

create policy "own habits" on habits for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own checkins" on checkins for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())));
