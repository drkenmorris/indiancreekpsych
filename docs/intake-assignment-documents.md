# Intake assignment documents

Section 2 (Emergency contact, guardian, and responsible party) accepts optional foster-parent and guardian assignment copies in patient-account and office/kiosk intake. Choose Court or State agency explicitly. PDF/JPEG/PNG files are limited to 2 MB each, eight files/eight MB per intake. File selection alone does not save; Upload saves the copy separately from answers. Preview performs no uploads. Submission prevents further uploads; authorized staff review can download submitted copies.

Content stays in private.intake_assignment_documents; no direct table grants or public file URLs. The RPC validates owner + existing patient secure session, an unexpired draft kiosk capability, or existing staff intake authorization + AAL2 for submitted-only review. Registered owners retain read access after submission. Expired/submitted kiosk capabilities cannot read documents. Parent locks serialize upload limits and submission. MIME/signature/size checks are server-side. Uploads do not confer guardianship or access permissions.

Apply 20261102170218_intake_assignment_documents.sql before releasing the matching client. It is additive; no answers or existing access rules change. Roll back the client if necessary while retaining the private table and documents. No patient responses or credentials are included in test artifacts.

Verification: six PGlite tests execute the actual migration for ownership/MFA/staff/kiosk/submission/file limits and denial; six UI tests cover scoped upload, preview, read-only review, invalid files, and failure preservation. Existing intake/ASQ/security regressions, TypeScript and production build pass. Authenticated live uploads require a patient or office session; no real documents are used for automated verification.
