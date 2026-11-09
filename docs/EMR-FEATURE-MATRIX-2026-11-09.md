# EMR feature-by-feature reconciliation decision matrix — 2026-11-09

**Scope:** Production `drkenmorris/indiancreekpsych` (`main`) versus standalone synthetic prototype `emr-workflow-demo.vercel.app`. This is an evidence-based comparison inventory, **not** certification that each module is complete or production-ready.

**Critical invariants (updated user instruction):** Preserve all working production scheduler appointments, calendar operations, recurrence and provider scheduling, and preserve the owner's existing administrative identity, credentials, MFA and permissions. Patient records outside the scheduler are currently predominantly test patients, but do not remove authorization or unintentionally expose any scheduler-linked real data. No production deployment from this branch.

**Comparison provenance:** Read production source directories and selected module contents via GitHub; inspected deployed prototype source tree and its frontend JavaScript; compared ten shared frontend assets earlier (four identical, six different); re-read 20 shared Python/JSON module entries. The deployment source reader truncates most long backend files: `clinical.py` was **fully identical**; the other 19 backend entries cannot be called fully identical or different from the truncated reads. The table separates *observable UI behavior* from *complete backend equivalence*.

## Decision key

- **KEEP LIVE** — production implementation has verified advantageous integration or is explicitly protected; do not overwrite it.
- **ADAPT PROTOTYPE** — prototype shows an additional workflow; implement through live authentication/storage after detailed checks.
- **COMPARE / HOLD** — both have relevant code but full behavioral parity and superiority are not established.
- **DEMO ONLY** — do not move fictional-only behavior into the live data path.

| # | Feature / function | Production evidence | Prototype evidence | Integration decision | Verification and unfinished work |
|---:|---|---|---|---|---|
| 1 | Practice/admin identity and login | Live clinic account, `emrAccess`, MFA, server checks | `providers.js` browser-carried provider-workspace/session vault | **KEEP LIVE** | Owner admin login/MFA must be verified after merge |
| 2 | Provider directory, roles, access | Live administrative auth and patient access | Local registration, invitation, file-maintenance role, provider profiles | **KEEP LIVE + COMPARE** | Check missing useful profile fields; do not import demo passwords/sessions |
| 3 | Patient repository, identifiers | Central UUIDs and `app/api/emr/patients`; protected patient read/write | Fictional local chart registry with generated short ID | **KEEP LIVE** | Check patient search, archive/restore and alias behavior separately |
| 4 | Demographics | Production central demographic precedence and clinician save | Extensive demographic/identity/episode form | **KEEP LIVE + ADAPT** | Field-by-field gap review; preserve server validation/revisions |
| 5 | Intake contact autofill | Clinical draft fields and explicit save | Fictional intake-to-form prefill | **INTEGRATED IN BRANCH** | Only blank email/address fields, explicit clinician action; no auto-save |
| 6 | Medication intake source review | Linked-account patient intake source with MFA and allowlist | Fictional medication intake and allergy autofill | **INTEGRATED READ-ONLY IN BRANCH** | Transfer into reviewed clinical record not yet built |
| 7 | Medical/substance intake source review | Protected intake source and clinical view | Fictional medical/substance history autofill | **INTEGRATED READ-ONLY IN BRANCH** | Reviewed clinical transfer outstanding |
| 8 | Medication history editing | Central clinical architecture retained | Current/past medication records, dates, prescriber, benefit; versioned edits | **ADAPT PROTOTYPE** | Design typed reviewed entries, version history and no overwrites |
| 9 | Medication allergies | Patient-reported intake source exposed read-only | Status and reaction narrative, conflict checks | **ADAPT PROTOTYPE** | Clinician attestation and reconciliation required |
| 10 | Biopsychosocial symptom checklist | Shared Python engine and EMR assessment paths | 7 history subpages; current symptom impact ratings | **COMPARE / HOLD** | Compare schemas, item selections, saved versions and rendering |
| 11 | Psychiatric treatment history | Existing EMR/clinic intake pathways | Inpatient/outpatient episodes and amendments | **ADAPT PROTOTYPE WHERE MISSING** | Determine central schema and migration rules |
| 12 | Family-of-origin history | Shared engine module exists | Multi-choice family background and narrative details | **COMPARE / HOLD** | Full backend parity unavailable; compare actual fields |
| 13 | Developmental/personal history | Shared engine module exists | Developmental, socio-economic and personal-history grids | **COMPARE / HOLD** | Preserve more complete fields and opt-out responses |
| 14 | Trauma history | Shared engine module exists | Structured history selections and optional source notes | **COMPARE / HOLD** | Validate clinical safeguards and access rules |
| 15 | Strengths/weaknesses library | Managed clinic strengths/challenges library and live mapping | Prototype generic notes/menu implementation | **KEEP LIVE** | Production implementation intentionally superior |
| 16 | Assigned assessments / questionnaires | Clinic admin test assignment workflow | Demo links out to live assignment interface | **KEEP LIVE** | Avoid replacing active assignment |
| 17 | DSM / diagnostic reference records | `/emr/dsm` and `/api/emr/dsm-records` with central persistence | Starter problem library + clinician-selected labels | **KEEP LIVE + COMPARE** | No automatic diagnostic inference; verify note integration |
| 18 | Treatment library / management | `/emr/treatment-planners`, `/api/emr/treatment-library` | Hierarchical original starter library | **KEEP LIVE + COMPARE** | Managed library must remain source of truth |
| 19 | Individual treatment plans | Central `PatientTreatmentPlan`, versioned `/api/emr/treatment-plans` | Hierarchical group/problem/definitions/goals/objectives/interventions; draft/finalize and goal agreement | **COMPARE / HOLD** | Compare bounds, agreement, signatures, history and report fidelity |
| 20 | Progress notes and amendments | Live central EMR workflows and protected records | DAP/SOAP/Narrative snapshots, demo signatures, attributed amendments | **ADAPT PROTOTYPE IF MISSING** | Audit signed note restrictions; never treat demo signatures as genuine |
| 21 | Psychotherapy/restricted notes | Production access architecture | Prototype explicitly says separate restricted boundary absent | **KEEP LIVE SECURITY / HOLD FEATURE** | Segregation must be proven before reuse |
| 22 | Group sessions and participation | Shared engine `groups.py` exists | Separate shared attendance/session records and individual notes | **COMPARE / HOLD** | Cross-patient authorization and billing behavior unresolved |
| 23 | Prognosis and utilization review | EMR sections and clinical workflow | Clinician narrative, factors, uncertainty, review date | **COMPARE / HOLD** | Determine production versions and links |
| 24 | Discharge summary | EMR module/workflow paths | Summary tied to signed note and prognosis | **COMPARE / HOLD** | Verify real episode closeout and clinical constraints |
| 25 | Scheduling and calendars | Working appointment scheduler, protected clinic calendar, recurrence | Demo scheduler explicitly disconnected; synthetic local appointments | **KEEP LIVE — PROTECTED** | Full regression must protect booked appointments, recurrence and staff schedules |
| 26 | Insurance details and prior coverage | Clinical intake and patient data capabilities | Current/previous insurance and authorization session counters | **ADAPT PROTOTYPE IF MISSING** | Compare live coverage fields; do not silently replace |
| 27 | Billing, charges, claims | Existing production interfaces require detailed comparison | Fictional encounters and two local claim preview adapters; no live EDI | **COMPARE / HOLD; DEMO ONLY CLAIMS** | Do not suggest claims transport exists without verification |
| 28 | Legal routing questionnaire | Clinic intake pages; production shared engine exists | Page-10 legal routing with form requirements | **COMPARE / HOLD** | Validate notice versions, rules and signatures |
| 29 | Signed notices / scanned documents | Live intake documents and clinical access boundary | PDF copies, statuses, revocation provenance, 150 KB demo cap | **ADAPT PROTOTYPE WHERE MISSING** | Use approved protected server storage, not browser/local base64 store |
| 30 | Patient consent / authorization history | Protected live records, intake forms | Discussed/acknowledged/declined/revoked synthetic events | **COMPARE / HOLD** | No demo acknowledgment constitutes real consent |
| 31 | Reports, history and provenance | Central clinical records and protected APIs | Printable synthetic chart reports and local SHA-256 snapshots | **COMPARE / HOLD** | Preserve auditability and ensure no PHI in demo exports |
| 32 | Administrative reports and exports | Clinic administrator controls | Synthetic CSV, JSON export, browser-local backup | **KEEP LIVE SECURITY + ADAPT UI** | Never expose unrestricted patient exports |
| 33 | UI navigation and preferences | Existing live EMR and admin shell | Sidebar, quick menus, compact/contrast modes and shortcuts | **COMPARE / HOLD** | Preserve live route integration and improve usability selectively |
| 34 | Synthetic patient storage & provider vault | Supabase central storage / clinic session authority | LocalStorage chart payload and browser provider-workspace vault | **DEMO ONLY — DO NOT TRANSFER** | Not an eligible replacement for live clinical data |

## Concrete code/file evidence

- Production: `app/emr/page.tsx`, `app/emr/PatientRepository.tsx`, `app/emr/workspace/route.ts`, `app/emr/treatment-plan/PatientTreatmentPlan.tsx`, `app/api/emr/{patients,treatment-plans,treatment-library,dsm-records,workflow}/route.ts`, `lib/emr/*`, `app/appointments/calendar/*`.
- Prototype: deployed `index.html`, `app.js`, `patients.js`, `planner.js`, `module-menu.js`, `providers.js`, `menu-completion.js`, `navigation-menus.js`, `style.css`, and `engine/modules/*`.
- Shared engine file inventory: 20 names. Fully verified identical bodies: `clinical.py` only. Others are **not** fully compared; source retrieval capped at about 2,014 base64 characters, so no parity conclusion is warranted.
- Read-only branch increments and their automated regression results are described in `docs/EMR-RECONCILIATION-2026-11-09.md` and draft PR #108.

## Gaps before calling the comparison *complete*

1. Obtain complete prototype backend module files (source checkout or complete export) to compare all 20 source bodies, not truncated deployment excerpts.
2. Compare full live clinical feature schemas and UI flows beyond the selected production files (especially treatment plans, progress notes, document storage, billing, group records, discharge, and access roles).
3. Obtain authenticated end-to-end screenshots/interactions for matching fictional charts in both environments, with scheduler untouched.
4. Identify exact production missing fields/workflows and turn each **ADAPT** row into a tested PR change.
5. Reconcile the integration branch's one-commit lag behind `main`; rerun regression and scheduler/admin acceptance checks.

**Audit outcome:** 34 feature areas inventoried and assigned preliminary integration disposition; no claim of 34 completed behavioral equivalence tests. Production still untouched.
