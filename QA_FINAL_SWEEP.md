# Final QA / Polish Sweep

This pass focused on stabilization and usability rather than adding new business modules.

## What was tightened

- Added an in-app guide page so operating rules are visible to end users.
- Added route-level loading UI for protected pages.
- Added a friendly global 404 page.
- Reinforced the product rule set already implemented in actions/UI:
  - open opportunities stay editable
  - won/lost opportunities stay closed for account managers
  - on-hold opportunities can be reactivated
  - activities are historical for account managers
  - admins retain correction authority

## High-risk pitfalls specifically avoided

- No new RLS helper recursion patterns were introduced.
- No new BEFORE-trigger write patterns were introduced for FK-dependent audit rows.
- No duplicate server-action declarations were added.
- No new server-component cookie writes were introduced outside the proxy/session pattern.

## Recommended regression checklist

1. Login as admin and as account manager.
2. Create account -> create opportunity.
3. Edit open opportunity and confirm task sync updates.
4. Add activity with and without next-step due date.
5. Close opportunity as won/lost/on hold.
6. Confirm account manager cannot reclassify closed outcomes.
7. Confirm admin can correct mistaken activity/close state.
8. Upload and download a document.
9. Search/filter/export on accounts, opportunities, tasks, reports.
10. Navigate across pages and verify loading/error/not-found behavior feels controlled.
