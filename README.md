# Craft Beer Sales Pipeline Starter

Starter application for the craft beer sales pipeline system.

## Current foundation
- Spanish-first interface
- English language switch
- Invite-only email access
- Admin-managed allowed email list
- Admin-managed products and services catalog
- Product/service required from stage 4 onward

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase Auth + Database + Storage

## Environment variables
Create `.env.local` with:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Getting started
1. Copy `.env.example` to `.env.local`
2. Add your Supabase URL, anon key, and service role key
3. Run `npm install`
4. Run migrations in order:
   - `001_schema.sql`
   - `002_rls.sql`
   - `003_foundation_requirements.sql`
   - `004_account_visibility_patch.sql`
5. Create at least one auth user by signing in once, or by creating the user in Supabase Auth
6. Insert one initial admin email into `allowed_emails`
7. Sign in again through the app

## Bootstrap SQL for first admin invite
Run after migration 003:

```sql
insert into public.allowed_emails (email, role, preferred_language, is_active)
values ('you@company.com', 'admin', 'es', true)
on conflict (email) do update
set role = excluded.role,
    preferred_language = excluded.preferred_language,
    is_active = true;
```

## Included in this starter
- Magic-link login page with allowlist check
- Protected app layout
- Dashboard shell
- Opportunities list shell
- Accounts list shell
- Tasks list shell
- Reports shell
- Admin access page
- Admin products/services catalog page
- Admin users page
- Shared types and Supabase clients
- Initial schema and RLS migrations
- Invite-only + language + product-enforcement migration

## Suggested next build steps
1. Opportunity create/edit flow
2. Stage transition form with validations
3. Product linking UI on opportunities
4. Account/contact create flow
5. Dashboard metrics and reports
6. Reminder automation jobs


## Current UI build phase
- richer dashboard cards
- create account flow
- create opportunity flow
- opportunity detail page
- demo/sample records for look and feel review
- CODE_PLAN.md included for next sprint planning
