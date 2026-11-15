# Patient diagnosis table

Diagnosis under Treatment Plan opens `/emr/diagnosis?patient=UUID&embedded=1` independently of assessment/library selections. The original prerequisite card is no longer used by this menu item. Earlier narrative plan diagnoses remain in their original records; no historical records are backfilled or rewritten.

The clinician adds up to 30 rows using diagnostic family → ICD disorder group → specific diagnosis. Selecting a code fills the official code description and ICD-10-CM code. Changing a parent clears its descendants. Each row records primary/secondary priority, provisional/confirmed/rule-out status, and up to 1,000 characters of notes. Choosing a new primary demotes the existing primary. No questionnaire results, diagnostic conclusions, claim submission, or billing entries are generated automatically.

## Coding source and coverage

The catalog contains 2,491 terminal codes extracted from the CDC/NCHS FY2027 ICD-10-CM order file, effective October 1, 2026 through September 30, 2027:

https://ftp.cdc.gov/pub/health_statistics/nchs/Publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip

`lib/emr/diagnosis-catalog.json` records the source URL, archive SHA-256, effective dates, canonical descriptions, groups and version. Inclusion: all F codes, G47 sleep codes, R40/R41/R45/R46/R48 symptoms, and Z codes. Only terminal codes (order-file validity flag 1) are selectable. ICD family headings are taken from three-character parent descriptions. Diagnostic family organization is application metadata.

This is an ICD-10-CM coding library organized into diagnostic families. It is **not** a complete DSM-5-TR nomenclature database, an exact DSM-to-ICD crosswalk, or licensed DSM criteria text. ICD descriptions can differ from DSM terminology. The organizing families do not determine a diagnosis or establish validated assessment coverage. Full DSM coverage requires a separately verified DSM source; do not relabel this data as exhaustive DSM content.

## Storage and access

Diagnosis rows are stored in the existing `emr_treatment_modalities.diagnoses` JSONB column, sharing its optimistic revision, clinic identity/MFA rules, active-patient checks, and assigned-provider chart access. API and database validators check canonical code/description/version, statuses, priority, duplicates and bounds. Diagnosis updates leave modality, care period and approach fields untouched. Administrator creation of a new row does not assign a staff provider.

A private trigger appends changes to `emr_diagnosis_versions` with patient, revision, actor and server time. Clients cannot insert, alter or delete history. Clearing the list appends an empty snapshot. The history panel shows the most recent 50 saved changes; older database versions remain retained. Staff history visibility follows current chart assignment. Legacy manual diagnoses remain in Record History.

Deploy migration `20261115070753_patient_diagnoses.sql` before releasing the page/API. The migration adds an initially empty diagnoses column, reference catalog and history table without changing existing clinical record contents. Existing code ignores these added objects, allowing application rollback without deleting clinical data.

## Verification

Focused tests cover cascading selections, automatic code display, explicit save/reload, preserved drafts after conflict, diagnosis-menu routing, API authorization and validation, database canonical pairing, duplicate/primary rejection, history immutability, clear-with-retention, assigned chart isolation and MFA. The migration replay fixture includes Supabase's existing `auth.users.banned_until` column required by the prior modality migration. Tests use bounded fictional data only; they do not establish clinical validity or live browser behavior.
