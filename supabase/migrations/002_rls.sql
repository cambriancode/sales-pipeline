create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_finance_supervisor()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'finance_supervisor', false)
$$;

create or replace function public.is_account_manager()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'account_manager', false)
$$;

create or replace function public.can_access_opportunity(opportunity_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_uuid
      and (public.is_admin() or public.is_finance_supervisor() or o.owner_user_id = auth.uid())
  )
$$;

create or replace function public.can_access_account(account_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = account_uuid
      and (
        public.is_admin()
        or public.is_finance_supervisor()
        or exists (
          select 1
          from public.opportunities o
          where o.account_id = a.id and o.owner_user_id = auth.uid()
        )
      )
  )
$$;

create or replace function public.can_access_contact(contact_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.contacts c where c.id = contact_uuid and public.can_access_account(c.account_id)
  )
$$;

alter table public.profiles enable row level security;
alter table public.account_types enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunity_types enable row level security;
alter table public.opportunity_stages enable row level security;
alter table public.lost_reasons enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_contacts enable row level security;
alter table public.products enable row level security;
alter table public.opportunity_products enable row level security;
alter table public.activities enable row level security;
alter table public.task_types enable row level security;
alter table public.tasks enable row level security;
alter table public.document_types enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;
alter table public.opportunity_stage_history enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin() or public.is_finance_supervisor());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy lookup_read_account_types on public.account_types for select using (auth.uid() is not null);
create policy lookup_read_opportunity_types on public.opportunity_types for select using (auth.uid() is not null);
create policy lookup_read_stages on public.opportunity_stages for select using (auth.uid() is not null);
create policy lookup_read_lost_reasons on public.lost_reasons for select using (auth.uid() is not null);
create policy lookup_read_task_types on public.task_types for select using (auth.uid() is not null);
create policy lookup_read_document_types on public.document_types for select using (auth.uid() is not null);
create policy lookup_read_products on public.products for select using (auth.uid() is not null);

create policy admin_write_account_types on public.account_types for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_opportunity_types on public.opportunity_types for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_stages on public.opportunity_stages for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_lost_reasons on public.lost_reasons for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_task_types on public.task_types for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_document_types on public.document_types for all using (public.is_admin()) with check (public.is_admin());
create policy admin_write_products on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy accounts_select on public.accounts for select using (public.can_access_account(id));
create policy accounts_insert on public.accounts for insert with check (public.is_admin() or public.is_account_manager());
create policy accounts_update on public.accounts for update using (
  public.is_admin() or (
    public.is_account_manager() and exists (
      select 1 from public.opportunities o where o.account_id = accounts.id and o.owner_user_id = auth.uid()
    )
  )
) with check (
  public.is_admin() or (
    public.is_account_manager() and exists (
      select 1 from public.opportunities o where o.account_id = accounts.id and o.owner_user_id = auth.uid()
    )
  )
);

create policy contacts_select on public.contacts for select using (public.can_access_contact(id));
create policy contacts_insert on public.contacts for insert with check (public.is_admin() or (public.is_account_manager() and public.can_access_account(account_id)));
create policy contacts_update on public.contacts for update using (public.is_admin() or (public.is_account_manager() and public.can_access_contact(id))) with check (public.is_admin() or (public.is_account_manager() and public.can_access_account(account_id)));

create policy opportunities_select on public.opportunities for select using (public.is_admin() or public.is_finance_supervisor() or owner_user_id = auth.uid());
create policy opportunities_insert on public.opportunities for insert with check (
  public.is_admin() or (
    public.is_account_manager() and owner_user_id = auth.uid() and created_by_user_id = auth.uid() and public.can_access_account(account_id)
  )
);
create policy opportunities_update on public.opportunities for update using (public.is_admin() or (public.is_account_manager() and owner_user_id = auth.uid())) with check (public.is_admin() or (public.is_account_manager() and owner_user_id = auth.uid()));

create policy opportunity_contacts_select on public.opportunity_contacts for select using (public.can_access_opportunity(opportunity_id));
create policy opportunity_contacts_write on public.opportunity_contacts for all using (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id))) with check (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id) and public.can_access_contact(contact_id)));

create policy opportunity_products_select on public.opportunity_products for select using (public.can_access_opportunity(opportunity_id));
create policy opportunity_products_write on public.opportunity_products for all using (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id))) with check (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id)));

create policy activities_select on public.activities for select using (public.can_access_opportunity(opportunity_id));
create policy activities_write on public.activities for all using (public.is_admin() or (public.is_account_manager() and created_by_user_id = auth.uid() and public.can_access_opportunity(opportunity_id))) with check (public.is_admin() or (public.is_account_manager() and created_by_user_id = auth.uid() and public.can_access_opportunity(opportunity_id)));

create policy tasks_select on public.tasks for select using (public.is_admin() or public.is_finance_supervisor() or (owner_user_id = auth.uid() and public.can_access_opportunity(opportunity_id)));
create policy tasks_write on public.tasks for all using (public.is_admin() or (public.is_account_manager() and owner_user_id = auth.uid() and public.can_access_opportunity(opportunity_id))) with check (public.is_admin() or (public.is_account_manager() and owner_user_id = auth.uid() and created_by_user_id = auth.uid() and public.can_access_opportunity(opportunity_id)));

create policy documents_select on public.documents for select using (public.can_access_opportunity(opportunity_id));
create policy documents_write on public.documents for all using (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id) and (owner_user_id is null or owner_user_id = auth.uid()))) with check (public.is_admin() or (public.is_account_manager() and public.can_access_opportunity(opportunity_id) and (owner_user_id is null or owner_user_id = auth.uid())));

create policy notes_select on public.notes for select using (public.can_access_opportunity(opportunity_id));
create policy notes_write on public.notes for all using (public.is_admin() or (public.is_account_manager() and created_by_user_id = auth.uid() and public.can_access_opportunity(opportunity_id))) with check (public.is_admin() or (public.is_account_manager() and created_by_user_id = auth.uid() and public.can_access_opportunity(opportunity_id)));

create policy stage_history_select on public.opportunity_stage_history for select using (public.can_access_opportunity(opportunity_id));
