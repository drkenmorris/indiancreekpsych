# EMR production/prototype reconciliation — 2026-11-09

## Sources and invariants

- Live source: `drkenmorris/indiancreekpsych`, production base `main` at `5d8ff0449840aeb73c54b7d8871268cad84470f8`.
- Separately deployed synthetic-data prototype: `https://emr-workflow-demo.vercel.app`, accessed 2026-11-09.
- Integration branch: `integration/emr-prototype-production-reconcile-20261109`.
- Preserve production Next.js/Supabase identity, MFA, RLS, central patient UUIDs, clinician-reviewed data, patient history and existing calendar. No prototype provider vault, browser-carried chart state, fictional patients, fake signatures, or synthetic calendar is eligible for a live-data substitution.
- Do not merge this branch or deploy to live until full integration, regression and access-control checks pass.

## Source-file comparison: 10 existing shared frontend assets

The deployed prototype's HTTP responses were compared with `main:public/emr-assets/*` on 2026-11-09. The following four file bodies are byte-for-byte identical:

| Asset | Comparison |
| --- | --- |
| `navigation.js` | Identical |
| `planner.js` | Identical |
| `menu-completion.js` | Identical |
| `style.css` | Identical |

The following six differ; file precedence must be evaluated by behavior, not date or size:

| Asset | Confirmed difference and treatment |
| --- | --- |
| `index.html` | Production serves the protected `/emr-assets/*` asset paths and live EMR title; prototype serves standalone root paths and prototype title. **Preserve production routing.** |
| `module-menu.js` | Production references the shared managed Strengths/Challenges library, where the prototype uses its original starter library. **Preserve production's central integration.** |
| `patients.js` | Production gives current central patient demographics precedence over older legacy chart snapshots; the prototype gives the saved local snapshot precedence. **Preserve production precedence**, pending full field-by-field tests. |
| `navigation-menus.js` | Production exposes the clinic account/logout path in place of standalone prototype logout. **Preserve production session integration.** |
| `providers.js` | Production contains additional clinic-account transport replacing the browser-carried provider-vault behavior at the end of the file. **Preserve production access boundary.** |
| `app.js` | Production uses the central patient UUID from the protected workspace URL; prototype defaults to a session-stored fictional demo chart and contains standalone fictional-intake transfer helpers. **No wholesale copy**; adapt eligible workflow logic selectively. |

These are *file-level comparison findings*, not proof that every module is fully reconciled.

## First selectively integrated workflow: clinician-reviewed intake contact prefill

Production already exposes a linked patient's reported intake source in the protected central EMR repository. The prototype demonstrated fictional intake-to-form autofill. This branch adds a safer, live-architecture adaptation:

- A clinician may populate **only empty** address/email fields from the currently linked patient-reported intake.
- The import is into the **unsaved demographics draft**, not directly into the Supabase row. The clinician must review and explicitly save using the existing authenticated EMR endpoint.
- Existing reviewed values are never replaced by the import. Names, DOBs, identity numbers, generic untyped phone numbers, and clinical content are not auto-copied.
- Non-string, blank, oversized and malformed email input is refused.
- Existing server-side validation, optimistic revision checks and authentication are unchanged.

Files: `lib/emr/intake-contact-prefill.ts`, `app/emr/PatientRepository.tsx`, `tests/emr-intake-contact-prefill.test.ts`.

## Verification, limitations, and remaining work

- Verified locally: the helper compiled with TypeScript strict settings and passed **three isolated behavior checks** (no-overwrite, invalid-data refusal, valid unsaved contact draft). These checks were run on a local copy of the helper, whose contents were separately confirmed against the branch file.
- The three Vitest checks have been committed in the branch, but **the repository's full Vitest, Python and Next.js build suites have not yet been executed in this automation run**. No authenticated browser release test has been completed.
- Unreconciled workflows include the prototype's medical/substance history and medication intake transfer demonstrations, legal routing, document management and provider/chart feature comparisons; each requires a production-vs-prototype review and safe RLS-backed adaptation where production lacks functionality.
- No change to production `main`, Vercel production deployment, existing patient records or live data was made by this branch.

**Release gate:** rebase against the latest `main`; run all EMR workflow, intake, auth, MFA, RLS, database, UI and build checks; conduct authenticated fictional-record browser tests in a nonproduction deployment; validate changed modules and obtain a rollback path before production promotion.
