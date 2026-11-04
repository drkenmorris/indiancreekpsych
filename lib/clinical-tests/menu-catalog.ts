/** Routes verified against the administrator-only migrated test workspace. */
export const clinicalTestSuites = [
  { key: "dsm", label: "DSM Screeners", short: "DSM", href: "/clinical-tests/dev/level1", area: "Screening", description: "Adult, adolescent and parent/guardian Tier 1 versions with separate follow-up plans.", stages: "Tier 1 · selected Tier 2 · clinician review" },
  { key: "cseq", label: "CSEQ Self-Esteem", short: "CSEQ", href: "/clinical-tests/cseq", area: "Self-esteem", description: "Comprehensive Self-Esteem Quotient questionnaire and narrative results.", stages: "Questionnaire · Results" },
  { key: "asq", label: "ASQ / ASEQ Autism", short: "ASQ / ASEQ", href: "/clinical-tests/asq", area: "Autism", description: "Student, parent and teacher forms, combined results, records and support.", stages: "Seven sections" },
  { key: "srrci", label: "SRRCI-X Relationship", short: "SRRCI-X", href: "/clinical-tests/srrci", area: "Relationships", description: "Individual questionnaire, source scoring and therapist-review report.", stages: "Seven-question pages · Results · PDF" },
  { key: "rtafi", label: "RTAFI Attachment", short: "RTAFI", href: "/clinical-tests/rtafi", area: "Relationships", description: "Individual stress, attachment and relational experience questionnaire with source-key cautions.", stages: "Seven-question pages · Results · PDF" },
  { key: "rdii", label: "RDII Relationship", short: "RDII", href: "/clinical-tests/rdii", area: "Relationships", description: "Relationship assessment, scoring, and developmental narrative reporting.", stages: "Seven-question pages · Results · PDF" },
  { key: "rvti", label: "RVTI Values", short: "RVTI", href: "/clinical-tests/rvti", area: "Relationships", description: "Relationship values, tolerance and integrity across domain groups.", stages: "Seven-question pages · Results · PDF" },
] as const;
