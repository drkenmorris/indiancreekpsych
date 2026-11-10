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

## Second selectively integrated workflow: protected read-only intake medical review

The production clinic intake already captures structured current/past medication entries, medication allergies, and medical/substance-use history. The separate prototype also displays these categories but relies on synthetic local chart storage. This integration retains the superior production access/storage architecture:

- The **existing administrator + MFA protected** central patient GET adds only four allowlisted intake keys for a patient with an explicitly linked account: `medication_entries`, `medication_allergy_status`, `medication_allergy_notes`, `medical_substance_history`.
- The central patient repository displays these values in a **read-only, explicitly labeled patient-reported** section, reusing the existing structured clinic intake readers and their schema validation.
- The original clinician-reviewed demographics, central chart, medical assessment, existing medication records and patient data are **not** rewritten. This review is not a clinical reconciliation or a verified medication list.
- Invalid historical structured payloads display a source-read error in their respective review components rather than being silently converted into clinical facts.
- A new UI test checks the source is visible for an explicitly linked patient, that reviewed demographics are unchanged, and that opening the section issues GET requests only.

**Backend module inventory:** 20 Python/JSON module filenames exist in both the deployed synthetic prototype `engine/modules` tree and production `emr_engine/modules` tree; the prototype's extra `providers.py` is intentionally **not** a candidate for replacing live Supabase/MFA. One shared engine file (`clinical.py`) was verified byte-identical using complete base64 response data. The remaining module files were **not confirmed byte-identical** because the deployment source retrieval returned truncated contents.

## Verification, limitations, and remaining work

- Verified locally: the helper compiled with TypeScript strict settings and passed **three isolated behavior checks** (no-overwrite, invalid-data refusal, valid unsaved contact draft). These checks were run on a local copy of the helper, whose contents were separately confirmed against the branch file.
- **GitHub Actions CI passed** for commit `2b71d65983aff147abd91e4c9f5cb0c7c5f1f5e4`, run [42717002819](https://github.com/drkenmorris/indiancreekpsych/actions/runs/42717002819): `npm ci`, `npm run typecheck`, `npm run test:intake` (including the Python EMR checks and committed Vitest UI checks), plus standalone kiosk Vitest. An authenticated nonproduction browser release check, explicit database migration/transaction validation, and a full Next.js production build have **not** yet been independently verified in this run.
- Unreconciled workflows include clinician-reviewed **transfer** of medical/substance and medication data into the actual central clinical record (as distinct from the completed read-only review), legal routing, document management and remaining provider/chart feature comparisons. Each requires a production-vs-prototype review and safe RLS-backed adaptation where production lacks functionality.
- No change to production `main`, Vercel production deployment, existing patient records or live data was made by this branch.

**Release gate:** rebase against the latest `main`; run all EMR workflow, intake, auth, MFA, RLS, database, UI and build checks; conduct authenticated fictional-record browser tests in a nonproduction deployment; validate changed modules and obtain a rollback path before production promotion.


## Third selectively integrated workflow: central group sessions and attendance (CI verified)

The legacy production `public/emr-assets/production.js` deliberately suppressed its synthetic group screen, although the bundled `emr_engine/modules/groups.py` existed as a fixed fictional roster. The separate prototype shows a shared-session and individual-note flow, but its demonstration SQLite/browser data is not acceptable as live clinical storage. A central replacement has now been committed on the protected integration branch:

- `/emr/groups` is a server-gated administrative page. The existing EMR link and legacy "Groups" menu now direct to it, without altering appointments or the administrator's identity.
- `/api/emr/groups` requires the current administrator session, MFA and same-origin POST; it accepts only a reviewed shared session with 2–30 **distinct central UUID patients** and each selected patient's Present/Absent/Excused attendance.
- New migration `20261109190000_emr_group_sessions.sql` stores an immutable shared session plus patient-bound participation records with owner-scoped read RLS. Only a strict `security definer` RPC can perform a single atomic insert; it rechecks administrator authorization and MFA.
- Group notes intentionally contain **shared topic and content only**. Clinician-authored participant-specific notes must stay in their individual patient workspaces. The system does **not** claim completed group billing, clinician signatures, individual note migration or group scheduling.
- Added DB/RLS regression and API validation tests, included in the existing test:intake pipeline.
- CI [run 42726275969](https://github.com/drkenmorris/indiancreekpsych/actions/runs/42726275969) on code commit `90a4ca8d9d8373f0651773dc48dfafb6cfd74b9d` **passed**: TypeScript, 130 Node tests, 259 Vitest tests across 54 files, full Next.js build, and 2 standalone kiosk tests. The full engine Python suite also completed as part of test:intake. These are test results, **not** a production-use or browser acceptance sign-off.
- **Outstanding before any production merge**: apply migration in nonproduction, validate authorized browser workflow and real patient-record access under clinic roles, cross-reference individual group notes and billing, and repeat scheduler/admin regression. Production remains unchanged.
