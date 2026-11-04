# Shared Strengths and Challenges Table

Administrative editor: `/emr/descriptor-library`. It is linked from the central
EMR directory, System Settings → Libraries, and the patient Strengths/Weaknesses
builder. A patient chart is not required to manage shared choices.

The clinic database stores `emr_descriptors`, seeded with 240 original descriptors.
Verified administrators with MFA can add up to 100 items per batch, edit wording,
change the list/domain, deactivate, and reactivate choices. A partial or failed
batch is not saved. Duplicate wording in the same list is rejected, including
inactive items. API edits use the expected revision to reject stale updates.
There is no hard-delete control. An immutable database snapshot is appended for
each add/change, with actor/time/revision. This table is for this clinic; it is
not a multi-tenant or public library service and contains no patient data.

Patient builders load active choices from `/api/emr/descriptors`, rather than
silently falling back to the original static bank. Open patient forms can use
**Refresh shared choices** after admin edits. Pending selections must be inserted
or cleared before refreshing. Existing patient narrative and earlier saved chart
versions retain their original wording. Custom choices added within one patient
form remain explicitly temporary; use the shared editor for permanent additions.

Access uses the existing clinic administrator/verified-email/MFA boundaries at
the page, API, and database RLS layers. Patient accounts and anonymous requests
cannot read or edit the table; no new staff permissions are granted.

Tests exercise actual Postgres RLS/constraints/audit snapshots and cross-admin
sharing, the API validation/origin/CAS behavior, the administrative UI save/error
flows, and new/inactive shared choices in the actual patient builder DOM.
