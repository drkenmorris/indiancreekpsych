# Strengths and challenges form builder

Open a central patient record, choose **Open full EMR chart and modules**, then
**Assessment → Strengths/Weaknesses**.

The builder offers 120 original strengths and 120 challenges/support needs across
24 domains. Search and domain filtering retain selections, including items hidden
by a filter. Native checkboxes support multiple independent choices. No choices
are preselected and no score or diagnosis is calculated.

Review the selected-wording preview, then choose **Copy selected wording** for
pasting elsewhere or **Insert selected into EMR fields**. Insert appends bullets
without replacing existing narrative, skips identical existing lines, and clears
the pending selections. Review or edit the narrative, then save the existing
section. Saving also inserts pending selections before using the existing central
chart transport. Both destination lengths are validated before inserting either.

**Add your own field items** accepts one descriptor per line for either list.
Custom choices are scoped to the open form; they do not create a persistent shared
practice library. Their inserted wording is retained in saved chart revisions.
No patient draft or custom choice is stored in localStorage by this feature.

Clipboard copy requires the browser's Clipboard API. If unavailable or denied, the
preview is selected for manual Command+C / Ctrl+C. Copying alone does not save a
chart entry. Existing records remain plain narrative snapshots; option IDs are
used for selection in this form, not substituted for historical chart wording.

The library is proposed documentation vocabulary, not a validated instrument.
Personal abilities, current difficulties, and environmental support needs require
individual context. Library guidance: ACL Person-Centered Planning
(https://acl.gov/programs/consumer-control/person-centered-planning).

Verification: `node --test tests/emr-workflow-ui.test.mjs` exercises the actual
hosted form against fictional central-transport fixtures, including all 240
choices, empty defaults, cross-filter selections, preservation and deduplication
of narrative, escaped custom wording, clipboard success/fallback, length limits,
pending-selection submission, and rendering of the returned saved entry.
