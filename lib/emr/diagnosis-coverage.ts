import report from './diagnosis-coverage.json';
export const diagnosisCoverage=report;
export function coverageText() {
 return [
  'DSM-5-TR REFERENCED-CODE COVERAGE AUDIT',
  'Checked: '+report.checkedOn+' | Catalog: '+report.catalogVersion,
  report.scope,
  'Compared: '+report.comparedCodes+' | Present: '+report.presentCodes+' | Current referenced codes absent: '+report.missingCurrentCodes.length+' | Historical/category references: '+report.historicalOrCategoryCodes.length,
  '',
  'CURRENT REFERENCED ICD-10-CM CODES NOT SELECTABLE IN THE EMR',
  'These include related medical conditions and encounter codes. Inclusion in a historical DSM reference is not a recommendation to use that mapping today.',
  ...report.missingCurrentCodes.map(row=>row.code+' | '+row.label+' | '+row.references.join('; ')),
  '',
  'HISTORICAL / NONTERMINAL REFERENCES — NOT A LIST OF MISSING DISORDERS',
  ...report.historicalOrCategoryCodes.map(row=>row.code+' | '+row.label+' | '+row.reason+(row.availableDescendants.length?' | Current selectable descendants: '+row.availableDescendants.join(', '):'')),
  '',
  'METHOD AND LIMITS',
  'Literal-code extraction from the 2022 classification and cumulative APA update, reconciled with official FY2027 terminal-code validity. Conditional diagnoses without literal codes and DSM names/specifiers are not a completeness audit. Not all medical examples or every code in the full DSM narrative are included. A current valid ICD code may have been replaced for a particular DSM diagnosis.',
  '',
  'SOURCES',
  ...report.sources.map(source=>source.title+'\n'+source.url),
  '',
 ].join('\n');
}
