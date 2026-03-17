create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.recalculate_weighted_value()
returns trigger
language plpgsql
as $$
begin
  new.weighted_value := round((coalesce(new.annual_value_estimate, 0) * coalesce(new.probability, 0) / 100.0)::numeric, 2);
  return new;
end;
$$;

create or replace function public.validate_open_opportunity_next_action()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'open' then
    if coalesce(trim(new.next_action), '') = '' then
      raise exception 'Open opportunities require next_action';
    end if;
    if new.next_action_due_date is null then
      raise exception 'Open opportunities require next_action_due_date';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.validate_close_requirements()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'won' then
    if new.close_date is null or new.close_value is null or coalesce(trim(new.won_proof_type), '') = '' then
      raise exception 'Won opportunities require close_date, close_value, and won_proof_type';
    end if;
  elsif new.status = 'lost' then
    if new.close_date is null or new.lost_reason_id is null then
      raise exception 'Lost opportunities require close_date and lost_reason_id';
    end if;
  elsif new.status = 'on_hold' and new.on_hold_until is null then
    raise exception 'On-hold opportunities require on_hold_until';
  end if;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'finance_supervisor', 'account_manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create table if not exists public.account_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.opportunity_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.opportunity_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null unique,
  default_probability numeric(5,2) not null check (default_probability between 0 and 100),
  is_closed boolean not null default false,
  is_won boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lost_reasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.task_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  account_type_id uuid references public.account_types(id),
  tax_id text,
  billing_city text,
  billing_country text,
  delivery_city text,
  delivery_country text,
  notes text,
  created_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_accounts_name on public.accounts(name);
create trigger trg_accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  full_name text not null,
  job_title text,
  email text,
  phone text,
  mobile_whatsapp text,
  is_decision_maker boolean not null default false,
  is_finance_contact boolean not null default false,
  is_operations_contact boolean not null default false,
  preferred_contact_method text,
  notes text,
  created_by_user_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_account_id on public.contacts(account_id);
create trigger trg_contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text,
  description text,
  unit_of_measure text,
  base_price numeric(14,2) check (base_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_at();

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  owner_user_id uuid not null references public.profiles(id),
  title text not null,
  opportunity_type_id uuid not null references public.opportunity_types(id),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'on_hold')),
  stage_id uuid not null references public.opportunity_stages(id),
  probability numeric(5,2) not null check (probability between 0 and 100),
  source text,
  expected_close_date date,
  stage_entered_at timestamptz not null default now(),
  annual_value_estimate numeric(14,2) not null default 0 check (annual_value_estimate >= 0),
  first_value_estimate numeric(14,2) not null default 0 check (first_value_estimate >= 0),
  weighted_value numeric(14,2) not null default 0 check (weighted_value >= 0),
  product_interest_summary text,
  package_interest_summary text,
  monthly_volume_estimate numeric(14,2) check (monthly_volume_estimate >= 0),
  annual_volume_estimate numeric(14,2) check (annual_volume_estimate >= 0),
  event_date date,
  guest_count_estimate integer check (guest_count_estimate >= 0),
  venue_type text,
  payment_terms_requested text,
  delivery_frequency text,
  target_price numeric(14,2) check (target_price >= 0),
  margin_estimate numeric(5,2) check (margin_estimate between 0 and 100),
  need_summary text,
  decision_maker_identified boolean not null default false,
  budget_status text,
  competitor text,
  last_touchpoint_at timestamptz,
  next_action text,
  next_action_due_date date,
  is_overdue boolean not null default false,
  is_stale boolean not null default false,
  stale_days integer not null default 0 check (stale_days >= 0),
  close_date date,
  close_value numeric(14,2) check (close_value >= 0),
  lost_reason_id uuid references public.lost_reasons(id),
  won_proof_type text,
  won_proof_file_path text,
  on_hold_until date,
  notes text,
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opportunities_owner_user_id on public.opportunities(owner_user_id);
create index if not exists idx_opportunities_status on public.opportunities(status);
create index if not exists idx_opportunities_stage_id on public.opportunities(stage_id);
create trigger trg_opportunities_updated_at before update on public.opportunities for each row execute function public.set_updated_at();
create trigger trg_opportunities_weighted_value before insert or update of annual_value_estimate, probability on public.opportunities for each row execute function public.recalculate_weighted_value();
create trigger trg_opportunities_validate_open before insert or update on public.opportunities for each row execute function public.validate_open_opportunity_next_action();
create trigger trg_opportunities_validate_close before insert or update on public.opportunities for each row execute function public.validate_close_requirements();

create table if not exists public.opportunity_contacts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  relationship_role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (opportunity_id, contact_id)
);

create table if not exists public.opportunity_products (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  product_id uuid references public.products(id),
  custom_item_name text,
  quantity_estimate numeric(14,2) check (quantity_estimate >= 0),
  unit_price_estimate numeric(14,2) check (unit_price_estimate >= 0),
  line_total_estimate numeric(14,2) check (line_total_estimate >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint chk_opportunity_products_item check (product_id is not null or nullif(trim(custom_item_name), '') is not null)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id),
  activity_type text not null,
  activity_at timestamptz not null default now(),
  summary text not null,
  details text,
  next_step text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_opportunity_id on public.activities(opportunity_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  owner_user_id uuid not null references public.profiles(id),
  task_type_id uuid references public.task_types(id),
  description text not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'completed', 'overdue', 'cancelled')),
  priority text,
  completed_at timestamptz,
  created_by_user_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_owner_user_id on public.tasks(owner_user_id);
create trigger trg_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  requested_by_user_id uuid references public.profiles(id),
  owner_user_id uuid references public.profiles(id),
  request_date date,
  due_date date,
  status text not null default 'requested' check (status in ('not_requested', 'requested', 'in_progress', 'uploaded', 'sent', 'accepted', 'rejected', 'expired')),
  file_path text,
  file_name text,
  file_size_bytes bigint,
  mime_type text,
  version_no integer not null default 1 check (version_no > 0),
  uploaded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_documents_opportunity_id on public.documents(opportunity_id);
create trigger trg_documents_updated_at before update on public.documents for each row execute function public.set_updated_at();

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_stage_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  from_stage_id uuid references public.opportunity_stages(id),
  to_stage_id uuid not null references public.opportunity_stages(id),
  changed_by_user_id uuid not null references public.profiles(id),
  changed_at timestamptz not null default now(),
  from_probability numeric(5,2),
  to_probability numeric(5,2),
  notes text
);

create or replace function public.log_stage_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.opportunity_stage_history (opportunity_id, to_stage_id, changed_by_user_id, to_probability, notes)
    values (new.id, new.stage_id, new.created_by_user_id, new.probability, 'Initial stage');
  elsif tg_op = 'UPDATE' and old.stage_id is distinct from new.stage_id then
    insert into public.opportunity_stage_history (opportunity_id, from_stage_id, to_stage_id, changed_by_user_id, from_probability, to_probability, notes)
    values (new.id, old.stage_id, new.stage_id, coalesce(new.owner_user_id, old.owner_user_id), old.probability, new.probability, 'Stage changed');
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;
create trigger trg_opportunities_stage_history before insert or update of stage_id on public.opportunities for each row execute function public.log_stage_change();

create or replace function public.sync_last_touchpoint()
returns trigger
language plpgsql
as $$
begin
  update public.opportunities
     set last_touchpoint_at = new.activity_at,
         updated_at = now()
   where id = new.opportunity_id
     and (last_touchpoint_at is null or new.activity_at > last_touchpoint_at);
  return new;
end;
$$;
create trigger trg_activities_sync_last_touchpoint after insert on public.activities for each row execute function public.sync_last_touchpoint();

insert into public.account_types (code, name, sort_order) values
  ('bar', 'Bar', 1),
  ('restaurant', 'Restaurant', 2),
  ('hotel', 'Hotel', 3),
  ('retailer', 'Retailer', 4),
  ('distributor', 'Distributor', 5),
  ('corporate', 'Corporate', 6),
  ('private_client', 'Private Client', 7),
  ('venue', 'Venue', 8),
  ('other', 'Other', 9)
on conflict (code) do nothing;

insert into public.opportunity_types (code, name, sort_order) values
  ('beer', 'Beer', 1),
  ('event', 'Event', 2),
  ('catering', 'Catering', 3),
  ('mixed', 'Mixed', 4)
on conflict (code) do nothing;

insert into public.opportunity_stages (code, name, sort_order, default_probability, is_closed, is_won) values
  ('identified', 'Opportunity Identified', 1, 5, false, false),
  ('first_contact', 'First Contact Established', 2, 15, false, false),
  ('qualified', 'Qualified / Decision Makers Engaged', 3, 30, false, false),
  ('proposal_sent', 'Proposal / Documentation Sent', 4, 60, false, false),
  ('first_order_expected', 'First Order Expected', 5, 80, false, false),
  ('won', 'Won / Sale Committed', 6, 100, true, true)
on conflict (code) do nothing;

insert into public.lost_reasons (code, name, sort_order) values
  ('lost_to_competitor', 'Lost to Competitor', 1),
  ('no_budget', 'No Budget', 2),
  ('no_response', 'No Response', 3),
  ('timing_issue', 'Timing Issue', 4),
  ('not_qualified', 'Not Qualified', 5),
  ('price_objection', 'Price Objection', 6),
  ('operational_mismatch', 'Operational Mismatch', 7),
  ('event_cancelled', 'Event Cancelled', 8),
  ('internal_cancellation', 'Internal Cancellation', 9)
on conflict (code) do nothing;

insert into public.task_types (code, name, sort_order) values
  ('call', 'Call', 1),
  ('email', 'Email', 2),
  ('whatsapp', 'WhatsApp', 3),
  ('meeting', 'Meeting', 4),
  ('send_quote', 'Send Quote', 5),
  ('send_docs', 'Send Documents', 6),
  ('follow_up', 'Follow-up', 7),
  ('internal_check', 'Internal Check', 8)
on conflict (code) do nothing;

insert into public.document_types (code, name, sort_order) values
  ('quote', 'Quote', 1),
  ('proposal', 'Proposal', 2),
  ('beer_menu', 'Beer Menu / Product Sheet', 3),
  ('event_package', 'Event Package Sheet', 4),
  ('pricing_sheet', 'Pricing Sheet', 5),
  ('payment_terms', 'Payment Terms', 6),
  ('terms_conditions', 'Terms and Conditions', 7),
  ('billing_details', 'Billing Details', 8),
  ('purchase_order', 'Purchase Order', 9),
  ('signed_approval', 'Signed Approval', 10),
  ('contract', 'Contract', 11),
  ('deposit_proof', 'Deposit Proof', 12),
  ('logistics_requirements', 'Logistics Requirements', 13),
  ('event_brief', 'Event Brief', 14),
  ('tax_data', 'Tax Data', 15)
on conflict (code) do nothing;
