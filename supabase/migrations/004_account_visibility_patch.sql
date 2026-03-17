-- Allow account managers to access accounts they created,
-- even before an opportunity is linked.

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
        or a.created_by_user_id = auth.uid()
        or exists (
          select 1
          from public.opportunities o
          where o.account_id = a.id
            and o.owner_user_id = auth.uid()
        )
      )
  )
$$;

drop policy if exists accounts_update_admin_or_linked_manager on public.accounts;

create policy accounts_update_admin_or_linked_manager
on public.accounts
for update
using (
  public.is_admin()
  or (
    public.is_account_manager()
    and (
      accounts.created_by_user_id = auth.uid()
      or exists (
        select 1
        from public.opportunities o
        where o.account_id = accounts.id
          and o.owner_user_id = auth.uid()
      )
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_account_manager()
    and (
      accounts.created_by_user_id = auth.uid()
      or exists (
        select 1
        from public.opportunities o
        where o.account_id = accounts.id
          and o.owner_user_id = auth.uid()
      )
    )
  )
);
