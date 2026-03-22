-- Personal dashboard targets + scheduled activity metadata for calendar/email workflows.

alter table public.activities
  add column if not exists scheduled_date date,
  add column if not exists scheduled_time time,
  add column if not exists scheduled_end_date date,
  add column if not exists scheduled_end_time time,
  add column if not exists timezone text,
  add column if not exists location text,
  add column if not exists calendar_uid text,
  add column if not exists notification_sent_at timestamptz;

create or replace function public.validate_activity_schedule()
returns trigger
language plpgsql
as $$
begin
  if new.scheduled_date is null
     and new.scheduled_time is null
     and new.scheduled_end_date is null
     and new.scheduled_end_time is null
     and coalesce(trim(new.timezone), '') = ''
     and coalesce(trim(new.location), '') = '' then
    return new;
  end if;

  if new.scheduled_date is null or new.scheduled_time is null or new.scheduled_end_date is null or new.scheduled_end_time is null then
    raise exception 'Scheduled activities require start and end date/time';
  end if;

  if coalesce(trim(new.timezone), '') = '' then
    new.timezone := 'America/Mexico_City';
  end if;

  if (new.scheduled_end_date, new.scheduled_end_time) < (new.scheduled_date, new.scheduled_time) then
    raise exception 'Scheduled activity end must be after start';
  end if;

  if coalesce(trim(new.calendar_uid), '') = '' then
    new.calendar_uid := gen_random_uuid()::text || '@calavera-ventas';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activities_validate_schedule on public.activities;
create trigger trg_activities_validate_schedule
before insert or update of scheduled_date, scheduled_time, scheduled_end_date, scheduled_end_time, timezone, location
on public.activities
for each row execute function public.validate_activity_schedule();

create table if not exists public.sales_targets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('monthly', 'quarterly', 'yearly')),
  period_start date not null,
  period_end date not null,
  won_value_target numeric(14,2) not null default 0 check (won_value_target >= 0),
  weighted_pipeline_target numeric(14,2) not null default 0 check (weighted_pipeline_target >= 0),
  raw_pipeline_target numeric(14,2) not null default 0 check (raw_pipeline_target >= 0),
  notes text,
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_targets_period_check check (period_end >= period_start),
  constraint sales_targets_period_unique unique (owner_user_id, period_type, period_start)
);

create trigger trg_sales_targets_updated_at
before update on public.sales_targets
for each row execute function public.set_updated_at();

create index if not exists idx_sales_targets_owner_period on public.sales_targets(owner_user_id, period_start desc);

alter table public.sales_targets enable row level security;

drop policy if exists sales_targets_select on public.sales_targets;
create policy sales_targets_select on public.sales_targets
for select
using (
  public.is_admin()
  or public.is_finance_supervisor()
  or owner_user_id = auth.uid()
);

drop policy if exists sales_targets_admin_write on public.sales_targets;
create policy sales_targets_admin_write on public.sales_targets
for all
using (public.is_admin())
with check (public.is_admin());
