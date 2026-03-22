-- Shared read visibility for account and opportunity directories,
-- while keeping commercial history, documents, tasks, and edits restricted.

create or replace function public.can_manage_account(account_uuid uuid)
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
        or (
          public.is_account_manager()
          and (
            a.created_by_user_id = auth.uid()
            or exists (
              select 1
              from public.opportunities o
              where o.account_id = a.id
                and o.owner_user_id = auth.uid()
            )
          )
        )
      )
  )
$$;

create or replace function public.can_edit_opportunity(opportunity_uuid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.opportunities o
    where o.id = opportunity_uuid
      and (
        public.is_admin()
        or (
          public.is_account_manager()
          and o.owner_user_id = auth.uid()
          and o.status = 'open'
        )
      )
  )
$$;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select using (auth.uid() is not null);

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities for select using (auth.uid() is not null);

drop policy if exists opportunity_products_select on public.opportunity_products;
create policy opportunity_products_select on public.opportunity_products for select using (auth.uid() is not null);

drop policy if exists accounts_update on public.accounts;
drop policy if exists accounts_update_admin_or_linked_manager on public.accounts;
create policy accounts_update_manageable on public.accounts
for update
using (public.can_manage_account(id))
with check (public.can_manage_account(id));

drop policy if exists opportunities_update on public.opportunities;
create policy opportunities_update on public.opportunities
for update
using (public.can_edit_opportunity(id))
with check (public.can_edit_opportunity(id));

drop policy if exists opportunity_contacts_write on public.opportunity_contacts;
create policy opportunity_contacts_write on public.opportunity_contacts
for all
using (public.is_admin() or (public.is_account_manager() and public.can_edit_opportunity(opportunity_id)))
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and public.can_edit_opportunity(opportunity_id)
    and public.can_access_contact(contact_id)
  )
);

drop policy if exists opportunity_products_write on public.opportunity_products;
create policy opportunity_products_write on public.opportunity_products
for all
using (public.is_admin() or (public.is_account_manager() and public.can_edit_opportunity(opportunity_id)))
with check (public.is_admin() or (public.is_account_manager() and public.can_edit_opportunity(opportunity_id)));

drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities
for all
using (
  public.is_admin()
  or (
    public.is_account_manager()
    and created_by_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
)
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and created_by_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
);

drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
for all
using (
  public.is_admin()
  or (
    public.is_account_manager()
    and owner_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
)
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and owner_user_id = auth.uid()
    and created_by_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
);

drop policy if exists documents_write on public.documents;
create policy documents_write on public.documents
for all
using (
  public.is_admin()
  or (
    public.is_account_manager()
    and public.can_edit_opportunity(opportunity_id)
    and (owner_user_id is null or owner_user_id = auth.uid())
  )
)
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and public.can_edit_opportunity(opportunity_id)
    and (owner_user_id is null or owner_user_id = auth.uid())
  )
);

drop policy if exists notes_write on public.notes;
create policy notes_write on public.notes
for all
using (
  public.is_admin()
  or (
    public.is_account_manager()
    and created_by_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
)
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and created_by_user_id = auth.uid()
    and public.can_edit_opportunity(opportunity_id)
  )
);
