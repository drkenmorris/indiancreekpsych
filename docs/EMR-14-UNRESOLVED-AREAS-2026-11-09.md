# EMR comparison follow-up: 14 unresolved clinical areas — 2026-11-09

This is a **source-verified follow-up**, not a claim that all 14 have passed complete behavioral equivalence. Work from the production `main` source and the separately deployed prototype source; retain the scheduler and existing administrator credentials. Do not merge or deploy production on the basis of this audit.

## New concrete findings

1. **Treatment-plan runtime precedence — KEEP LIVE.** Production `public/emr-assets/production.js` intercepts the legacy `plan` view and routes to `/emr/treatment-plan?patient=<central uuid>`. `app/emr/treatment-plan/PatientTreatmentPlan.tsx` implements centrally loaded, versioned plan snapshots with draft/finalized choices, problem hierarchy, patient goal-agreement entries, controlled revisions and a printable saved version. The prototype `planner.js` also has a hierarchy and goal-agreement controls, but its local plan version may not replace the central source. Remaining: compare exact finalization, signature and clinical linked-note behavior.
2. **Treatment library — KEEP LIVE.** Production `/api/emr/treatment-library` reads/writes `emr_treatment_library` behind MFA and same-origin checks. Prototype has an original starter library and static snapshot. Remaining: compare any missing selection/edit controls, not the storage authority.
3. **Group therapy — CENTRAL SHARED SESSION INTEGRATED ON BRANCH (TESTED, NOT DEPLOYED).** Replaced the production placeholder in the protected integration branch with `/emr/groups`, an MFA/admin-gated form using an atomic PostgreSQL RPC, owner-scoped RLS, distinct central patient IDs and immutable shared sessions/attendance. Synthetic demo storage remains excluded. The individual per-patient note workflow, signatures and billing are still outstanding.
4. **Appointment scheduling — KEEP LIVE, DO NOT ALTER.** Production `production.js` redirects scheduling to `/appointments`; `app/appointments/calendar/CalendarClient.tsx` uses Supabase and the actual appointment/calendar model. The prototype scheduler is synthetic and disconnected. Must regression-test existing recurring and one-off appointments before any release.
5. **Administrative identity — KEEP LIVE, DO NOT ALTER.** `app/api/emr/workflow/route.ts` returns 403 without administrator sign-in/MFA and forwards authenticated workflow requests; prototype `providers.js` uses a browser-carried registration/session design. Preserve live administrator account, authentication and permissions. Never import synthetic passwords.
6. **Patient demographics and identity — KEEP LIVE + SELECTIVE PREFILL.** `app/emr/PatientRepository.tsx` works through protected `/api/emr/patients` with central IDs and explicit save/revision controls. Prototype `patients.js` has expanded demographic and episodic fields. Clinician-triggered blank-only contact prefill is integrated; full field-by-field gap and episode behavior remain unverified.
7. **Medication source review — READ-ONLY INTEGRATED, TRANSFER PENDING.** Branch UI reads allowlisted linked intake values and distinguishes unverified patient report. Prototype offers current/past medication entries, prescriber, dates, effects; central clinician-approved record model to be checked before write integration.
8. **Medical/substance use — READ-ONLY INTEGRATED, TRANSFER PENDING.** Same linked-source adaptation; compare complete structured fields, historical edits, clinical attestation.
9. **Progress notes/amendments — PROTOTYPE FUNCTION EXISTS, LIVE PARITY UNVERIFIED.** Prototype `app.js` renders DAP/SOAP/Narrative, saved note snapshots, fictional signatures and attributed amendments. Production central engine exists but full note/storage/authorization behavior requires inspection. No assumption that demo signatures are legitimate.
10. **Legal routing and signed documents — PROTOTYPE UI EXISTS, LIVE PARITY UNVERIFIED.** Prototype routes intake page 10 and PDF copy status with synthetic-only upload limits. Production has intake pages and shared legal engine filenames; compare exact form requirements and production server-side storage.
11. **Psychotherapy notes — HOLD.** Prototype states a distinct restricted-note authorization boundary is not implemented. Preserve existing clinic permissions and do not claim secure restricted-note storage without end-to-end verification.
12. **Prognosis and discharge — PROTOTYPE FORMS EXIST, LIVE PARITY UNVERIFIED.** Prototype has clinician-authored prognosis and discharge forms tied to other chart records; compare actual backend schemas, saved versions and allowed sequence.
13. **Insurance and billing — PROTOTYPE FORMS EXISTS, LIVE PARITY UNVERIFIED.** Prototype shows current/archive insurance, authorization counters, fictional encounters and two preview-only claim adapters. No claims transmission exists in the demo. Determine actual live coverage/billing before porting fields.
14. **Reports, exports and audit — HOLD.** Prototype has browser-local chart reporting and CSV/JSON demo backup; production has protected central records and versioned paths. Any useful UI must use restricted server-side export, never unrestricted demo local state.

## Comparison and testing accounting

- **14/14 areas above have concrete source-reference and preliminary integration decisions; group shared-session/attendance now also has a protected-branch implementation.**
- **0/14 can be represented as end-to-end parity proven** based on the current tool access. Multiple categories are intentionally marked *unverified*.
- Earlier 10 shared frontend byte comparisons remain 4 identical + 6 differing. One additional `clinical.py` is fully identical.
- The 20 shared engine files were re-requested individually from the Vercel CLI deployment. Most source payloads are capped at ~2014 base64 characters, so a full-file byte comparison cannot be established from the returned fragments; do not label them different solely because the fragments are truncated.
- New code since the first comparison: **one shared-session/attendance module** (PostgreSQL migration, protected API, admin UI, navigation). Existing intake-review increments remain in draft PR #108; production unchanged.
- New tests: group SQL/RLS and API validation added. CI run [42726275969](https://github.com/drkenmorris/indiancreekpsych/actions/runs/42726275969) passed on commit `90a4ca8d9d8373f0651773dc48dfafb6cfd74b9d` (130 Node tests, 259 Vitest tests, Next.js build, standalone kiosk tests). Nonproduction database migration and authorized browser acceptance still outstanding.

## Next engineering order

1. Complete prototype backend source recovery and production engine parity review.
2. Validate the new group-session module in a nonproduction database/browser and separately build individual patient group notes and billing linkages; preserve admin permissions.
3. Compare structured medication, medical/substance, BPS, trauma, family and developmental fields and implement clinician-reviewed writes.
4. Compare legal documents, notes/amendments, prognosis, discharge, insurance, billing and reports against actual central schemas.
5. Reconcile behind-main commit, test all protected scheduler/admin functions and all EMR workflows before production deployment.

**Owner's instruction:** scheduler and administrative credentials are protected even if most other current patient charts are synthetic. Never change production automatically.
