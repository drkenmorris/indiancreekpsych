/** Routes verified against the administrator-only migrated test workspace. */
export const clinicalTestSuites = [
  { key: "dsm", label: "DSM Screeners", short: "DSM", href: "/clinical-tests/dev/level1", area: "Screening", description: "Level 1 overview and nineteen Level 2 symptom domains.", stages: "Level 1 · Level 2 modules" },
  { key: "cseq", label: "CSEQ Self-Esteem", short: "CSEQ", href: "/clinical-tests/cseq", area: "Self-esteem", description: "Comprehensive Self-Esteem Quotient questionnaire and narrative results.", stages: "Questionnaire · Results" },
  { key: "asq", label: "ASQ / ASEQ Autism", short: "ASQ / ASEQ", href: "/clinical-tests/asq", area: "Autism", description: "Student, parent and teacher forms, combined results, records and support.", stages: "Seven sections" },
  { key: "srrci", label: "SRRCI-X Relationship", short: "SRRCI-X", href: "/clinical-tests/srrci", area: "Relationships", description: "Relationship registration, questionnaire, scoring and results.", stages: "Registration · Assessment · Results" },
  { key: "rtafi", label: "RTAFI Attachment", short: "RTAFI", href: "/clinical-tests/rtafi", area: "Relationships", description: "Relational trauma and attachment assessment with household configuration.", stages: "Intake · Household · Assessment · Results" },
  { key: "rdii", label: "RDII Relationship", short: "RDII", href: "/clinical-tests/rdii", area: "Relationships", description: "Relationship assessment, scoring, and developmental narrative reporting.", stages: "Questionnaire · Results · Report" },
  { key: "rvti", label: "RVTI Values", short: "RVTI", href: "/clinical-tests/rvti", area: "Relationships", description: "Relationship values, tolerance and integrity across domain groups.", stages: "Domain questionnaire · Results" },
  { key: "cogswitch", label: "CogSwitch Cognitive-Motor", short: "CogSwitch", href: "/clinical-tests/cogswitch", area: "Cognitive", description: "Cognitive-motor switching tasks, sessions, reports and settings.", stages: "Home · Assessment · Briefing · Training · Results · Reports · Settings" },
] as const;

export const cogSwitchStages = [
  { key: "home", label: "Overview", href: "/clinical-tests/cogswitch" },
  { key: "assessment", label: "Assessment", href: "/clinical-tests/cogswitch/assessment" },
  { key: "briefing", label: "Session briefing", href: "/clinical-tests/cogswitch/briefing" },
  { key: "training", label: "Training", href: "/clinical-tests/cogswitch/training" },
  { key: "results", label: "Results", href: "/clinical-tests/cogswitch/results" },
  { key: "reports", label: "Reports", href: "/clinical-tests/cogswitch/reports" },
  { key: "settings", label: "Settings", href: "/clinical-tests/cogswitch/settings" },
] as const;
