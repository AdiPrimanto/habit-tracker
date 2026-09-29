create table goals (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits on delete cascade,
  target smallint not null check (target between 1 and 365),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on and ends_on - starts_on < 365),
  status text not null default 'active' check (status in ('active', 'achieved', 'failed', 'cancelled')),
  finished_on date,
  created_at timestamptz not null default now(),
  check ((status = 'active') = (finished_on is null))
);
create unique index goals_one_active on goals (habit_id) where status = 'active';
create index on goals (habit_id, created_at desc);

alter table goals enable row level security;

create policy "own goals" on goals for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = (select auth.uid())));
