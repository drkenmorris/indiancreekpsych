# Linked Treatment Planner

Shared editor: `/emr/treatment-planners`.
Patient planner: `/emr/treatment-plan?patient=<central-patient-UUID>`.
The full EMR Home menu links **Manage Treatment Planner** to the editor. The
Treatment Plan main module opens the new patient planner. Both also have central
patient-directory links. Earlier EMR plan records remain in Record History.

Library hierarchy: Problem / Diagnosis → Definition → Goal → Objective →
Intervention. Each node has a stable ID, parent link, editable wording, and active
status. Administrators can add choices one per line under the selected parent,
edit wording, and deactivate/reactivate items. Changes are staged in memory until
**Save shared library** creates a permanent revision. IDs and parent links cannot
be reassigned or removed; add a new linked choice and deactivate the old one when
restructuring a branch. Deactivating a parent hides that branch in new plans.

Original starter bank: 24 problem areas, 48 definitions, 96 goals, 96 objectives,
and 192 interventions (456 linked nodes). This is original proposed wording,
not a validated instrument, a diagnosis engine, or licensed third-party planner
content. Customize objectives, frequency, timeframe, and interventions after
assessment and shared decision-making. The general design is informed by SAMHSA
person-centered planning guidance, not a claim of regulatory certification:
https://www.samhsa.gov/sites/default/files/grants/pdf/revised-ccbhc-final-5-24-18.pdf

Patient plans support 1–5 problems, no more than 2 definitions per problem, and
multiple goals/objectives/interventions (up to 20 children at each lower level).
Every chosen branch follows its selected parent. Patient-specific wording can
be customized without changing the library; source wording and library revision
remain in saved snapshots. Drafts can be incomplete. Finalized plans require
exactly one primary problem, complete branches reaching interventions, patient
agreement on every goal, and an explicit clinician-review checkbox. This does not
create electronic signatures or establish a diagnosis from a menu label.

The saved plan report includes patient name/DOB, clinician, date, status, version,
review date, hierarchy, notes and source reference. **Print saved treatment plan**
prints the selected immutable saved version, with editor controls excluded. Drafts
are labeled. Selecting an older version changes the report, not the current draft.

Persistence is in the clinic database: emr_treatment_library and immutable
emr_treatment_library_versions; owner-scoped emr_treatment_plans and immutable
emr_treatment_plan_versions. Page/API/DB use existing verified admin + MFA
boundaries. Shared libraries contain no patient data. Plan resolution occurs in
the database against the pinned current library, enforcing ancestry, active
choices, limits, agreement, patient/clinician binding, source wording, and revision
conflicts independently of the UI. Existing patient records are not migrated.
