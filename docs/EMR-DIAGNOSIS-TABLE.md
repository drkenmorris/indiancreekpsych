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

## Criteria overviews, coding advisories, and revised layout

Each diagnosis now has its own selection table, a source-linked reference panel, a full-width notes line, and an Actions line underneath. Selecting a code fetches `/api/emr/diagnoses/reference?code=...` through the existing clinic MFA gate. The reference endpoint reads bundled metadata only and returns no patient information. Abort and code-identity guards prevent a late response from replacing guidance for another selection.

`diagnosis-criteria-overviews.json` contains 69 original concise clinical overviews, matching 684 coded selections (669 F and 15 G selections). Sources include APA public clinical information, NIH, CDC, VA, SAMHSA and MSD Professional. A group overview is explicitly identified as such. These are not complete DSM criteria sets, an exhaustive DSM crosswalk, or clinician-validated diagnostic decision rules. They do not supply every duration, symptom count, developmental qualification, exclusion or specifier. Unmapped selections explicitly state the gap; Z and R selections explain their circumstance/symptom role. No summary is substituted for missing criteria. Criterion descriptions are references, not chart findings.

`diagnosis-coding-notes.json` contains normalized inherited coding instructions from official CDC/NCHS FY2027 Tabular XML for 2,396 catalog selections. Code-first, use-additional-code, code-also, Excludes1/2 and other notes retain their scope and source wording; this government source is separate from DSM overview text. Additional APA coding advisories cover substance combination codes and neurocognitive conditions. Clinical primary/secondary priority is explicitly distinguished from claim sequencing. Exclusion references are never offered as add-code suggestions.

Referenced code expressions are resolved against the actual selectable catalog. Unavailable references are identified explicitly; range/prefix choices show the available descendants. A therapist can choose a clinically supported related code, then use the connected diagnosis's Actions line to add it as an **unsaved provisional secondary row**. Adding is explicit, does not save the chart, and cannot silently add duplicate codes. No missing catalog codes are imported by this release.

`/emr/diagnosis?coverage=1` displays the missing referenced-code audit after the same identity/MFA gate. The downloadable text audit uses `/api/emr/diagnoses/reference?coverage=1`. The audit compares 820 unique literal ICD code references in the 2022 DSM classification (PDF pages 41–91) and the cumulative APA update through September 2025: 717 references are selectable; 70 are current FY2027 terminal codes absent from this catalog; 33 are older, nonterminal or incomplete references. Medical-condition examples and encounter codes are included. This is not an audit of every DSM name/specifier or every code example elsewhere in the full manual. A currently valid code can have a superseded DSM mapping. Historical/nonterminal references are listed separately with any available descendants, not called missing disorders.

`scripts/build-diagnosis-reference.py` reproduces the coding metadata and literal-code audit using scratch inputs whose hashes are recorded. The DSM manual itself and criteria text are not shipped in the application. The scratch PDF extraction and synthetic preview route are not release files. The source catalog, saved diagnosis schema, revision checks and historical data are unchanged.
