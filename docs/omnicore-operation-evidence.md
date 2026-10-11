# Selected protected-operation evidence

This upgrade copies the four OmniCore connector files exactly from released OmniCore PR #17 (feature f561399; production merge cc3cd4b). The receiver must be deployed first. The connector retains existing approval, verified identity, administrator authorization, input validation and guarded database calls. It activates no new rule or operation approval.

The office-hours toggle reports only action=update, resource=records, selected outcome and count. A returned update row produces changed/1; a successful zero-row result produces none/0; an error or inconsistent connection-check result produces unknown/null. A reported update can assign the same value already present: the count describes the returned database update result, not a before/after value comparison. No record identifier, schedule, patient details, payload, cookie or token is added to telemetry.

Gate reasons and business-handler state are linked to server-created request and operation identifiers. Completion means the handler returned, even when its application response is an error. Selected effect receipts are adapter declarations, not independent database audit, file-integrity or subsequent-activity evidence. A missing receipt remains unknown; delivery failures remain collection gaps.

The reserved connection check retains its contradictory AND filters, proven against isolated PostgreSQL, so no row can match even if a reserved-ID row exists. Its explicit zero receipt does not generalize to other operations. No actual clinic record is changed by development tests.

Review covers connector parity with the receiver release, owner-approval and authorization gates, exact parent/request linkage, returned-row, missing-row and ambiguous-error receipts, and the no-change check. Deployment is receiver first, then clinic preview/build checks, then authorized clinic production merge. Preview configuration is not assumed to be an isolated database, and protected mutation tests use local synthetic adapters and isolated PostgreSQL only.
