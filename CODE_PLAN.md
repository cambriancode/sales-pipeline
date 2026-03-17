# Code Plan

## Current completed slices
- Invite-only auth with bilingual shell
- Accounts, opportunities, tasks, activities, close flow
- Document tracking metadata
- Live dashboard and reports

## This build
- Real document upload to Supabase Storage via server-side admin client
- Signed download links on opportunity detail
- Dashboard and reports now include close-flow metrics

## Next strongest slice
- Search, filters, and export polish
- Inline field-level validation states
- Final regression pass across auth, RLS helpers, triggers, and server actions


## Latest slice
- Search and filter added to accounts, opportunities, tasks, and reports
- CSV export endpoints added for accounts, opportunities, tasks, and reports
- In-app error boundary added under app/(app)/error.tsx for friendlier recovery during regression issues
