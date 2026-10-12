# Migration inventory: independent clinical psychological tests
Date: 2026-10-12

## Scope and separation
Both `omnicore.life` and `conscienceosx.com` resolve to the Vercel `conscience-os-x` project backed by `drkenmorris/ConscienceOS_X`.
The destination `indiancreekpsych.com` is Vercel `indiancreekpsych` backed by `drkenmorris/indiancreekpsych`.

**Do not move** any of the 21 core governance assessments in ConscienceOS X: Primary, Secondary, Advanced and ADA-X, including their assessment persistence, profile synthesis and Mirror/OmniCore interfaces.

**Independent clinical families to migrate:**
- ASEQ / ASQ: Student, Parent, Teacher, student records, behavioral support log, combined results and narratives.
- CSEQ: self-esteem questionnaire, results, scoring and item bank.
- SRRCI-X: registration, assessment, results, narrative path and related question banks.
- RTAFI: intake, household setup, assessment, results and psychometric engine.
- RDII: assessment, results, dev narrative report, scoring and question banks.
- RVTI: dev dashboard, assessment-related engines and scoring.
- DSM-aligned clinical screening suite: Level 1, 19 Level 2 domains, module routing, domain preview, validity playground and any scoring helpers.
- Legacy Parent Autism assessment and independent autism, ADHD, anxiety/mood and personality test selector prototypes.
- Review CogSwitch separately for its classification as a standalone psychological/cognitive assessment versus decision tooling.

**Not clinical tests:** FNBO PDF utility, marketing hub, ConscienceOS X core moral governance, Mirror and other shared decision engines; exclude from transfer unless a concrete dependency requires an adapter.

## Staging tranche 1
Copied CSEQ, ASQ/ASEQ, SRRCI-X, RTAFI, RDII, RVTI standalone assessment source and their scoring/report dependencies (admin synthetic QA only), plus Level 1 and 19 Level 2 clinical module source files (plus the shared engine) into `lib/clinical-tests/legacy/dev`.
These are wired to an administrator-only `/clinical-tests` workspace with the existing verified account, role and security gate from `patientAccess(true)`.
The legacy React Router links use the Next.js navigation adapter.
Legacy localStorage persistence was replaced by an in-memory QA-only adapter to avoid writing sensitive test answers to the browser's persistent storage.

**Restrictions:** Synthetic administrative testing only. This is not a validated diagnostic product or a production patient-service release. No Supabase result persistence or patient onboarding to these new tests yet. Full refresh clears answers. Do not remove the source application's menus, code, or existing assessment records until parity, data migration, RLS, consent, clinical governance, and end-to-end tests pass.

## Remaining release gates
1. Inventory every clinical source and dependency; create an exact source→destination route map, including legacy deep links and menus.
2. Clinical instrument rights and psychometric-version checks.
3. Create encrypted/role-restricted Supabase assessment sessions and scoring/results tables; row-level security, retention, audit logs and explicit consent; account ownership and provider access.
4. Validate migrated ASQ, CSEQ, SRRCI-X, RTAFI, RDII and RVTI workflows end-to-end; connect clinically appropriate Supabase storage with RLS and patient permissions; review incomplete screener registry prototypes and CogSwitch.
5. Functional/automated QA on previews with synthetic identities; protect the 21 governance assessments with regression tests.
6. Only after test parity and authorized cutover: add source redirects, remove duplicate clinical menu branches and deploy target/source in that order. Never delete legacy patient records merely to change UI ownership.

## Cognitive-Motor Switching
CogSwitch cognitive reaction and Go/No-Go exercises have also been copied into the administrator-only QA library. Settings, reports, and results remain temporary until clinical persistence and testing are complete.
