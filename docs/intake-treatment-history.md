# Structured counseling / psychiatric history

The Mental health treatment history intake section begins with repeatable treatment entries matching the EMR Counseling / Psychiatric History fields: Inpatient/Outpatient setting, provider/facility, optional start/end dates, ongoing treatment, reason, and outcome/notes. Existing narrative questions and answers remain beneath the new entries.

Available in patient-account intake, office/iPad intake and the non-saving administrator preview. Entries save with the existing questionnaire draft/submit flow. Staff review renders each field as text. Submitted account records remain locked and kiosk completion still clears displayed answers.

The optional `treatment_history_entries` answer is a JSON-encoded string containing up to 20 entries; this preserves the existing string-valued intake answer contract and kiosk stale-draft comparison. It is parsed and validated at the database boundary, including exact keys/types, bounded text, strict nonfuture dates, date order and ongoing/end-date consistency. Drafts may be incomplete. Before submission, a populated entry requires setting plus provider/facility or reason. Entirely blank entries are optional. The serialized answer is bounded to 70,000 characters and the existing total answer limit remains 160,000 bytes. Other field limits, legal-packet validation and authorization remain unchanged.

This adds intake fields only. It does not connect clinic records to the separate EMR prototype or copy real patient data into it.
