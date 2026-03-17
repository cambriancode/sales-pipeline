-- Spanish-first + invite-only access + admin-managed product enforcement

alter table public.profiles
  add column if not exists preferred_language text not null default 'es'
  check (preferred_language in ('es', 'en'));

create table if not exists public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'finance_supervisor', 'account_manager')),
  preferred_language text not null default 'es' check (preferred_language in ('es', 'en')),
  is_active boolean not null default true,
  invited_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_allowed_emails_updated_at
before update on public.allowed_emails
for each row execute function public.set_updated_at();

create index if not exists idx_allowed_emails_email on public.allowed_emails(email);
create index if not exists idx_allowed_emails_is_active on public.allowed_emails(is_active);

create or replace function public.validate_products_required_for_stage()
returns trigger
language plpgsql
as $$
declare
  stage_sort_order integer;
  linked_product_count integer;
begin
  select sort_order into stage_sort_order
  from public.opportunity_stages
  where id = new.stage_id;

  if coalesce(stage_sort_order, 0) >= 4 then
    select count(*) into linked_product_count
    from public.opportunity_products
    where opportunity_id = new.id;

    if linked_product_count = 0 then
      raise exception 'Stage 4 or later requires at least one linked product or service';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_products_required_after_line_change()
returns trigger
language plpgsql
as $$
declare
  stage_sort_order integer;
  linked_product_count integer;
begin
  select os.sort_order into stage_sort_order
  from public.opportunities o
  join public.opportunity_stages os on os.id = o.stage_id
  where o.id = coalesce(new.opportunity_id, old.opportunity_id);

  if coalesce(stage_sort_order, 0) >= 4 then
    select count(*) into linked_product_count
    from public.opportunity_products
    where opportunity_id = coalesce(new.opportunity_id, old.opportunity_id);

    if linked_product_count = 0 then
      raise exception 'Stage 4 or later requires at least one linked product or service';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_opportunities_validate_products_required on public.opportunities;
create trigger trg_opportunities_validate_products_required
before insert or update of stage_id on public.opportunities
for each row execute function public.validate_products_required_for_stage();

drop trigger if exists trg_opportunity_products_validate_after_delete on public.opportunity_products;
create trigger trg_opportunity_products_validate_after_delete
after delete on public.opportunity_products
for each row execute function public.validate_products_required_after_line_change();

alter table public.allowed_emails enable row level security;

create policy allowed_emails_admin_select
on public.allowed_emails
for select
using (public.is_admin());

create policy allowed_emails_admin_insert
on public.allowed_emails
for insert
with check (public.is_admin());

create policy allowed_emails_admin_update
on public.allowed_emails
for update
using (public.is_admin())
with check (public.is_admin());

create policy allowed_emails_admin_delete
on public.allowed_emails
for delete
using (public.is_admin());
