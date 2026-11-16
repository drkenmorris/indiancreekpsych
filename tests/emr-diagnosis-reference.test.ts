import {expect,test} from 'vitest';
import {diagnosticReference} from '@/lib/emr/diagnosis-reference';
import {diagnosisCoverage,coverageText} from '@/lib/emr/diagnosis-coverage';
import {diagnosisCatalog} from '@/lib/emr/diagnoses';
import overviews from '@/lib/emr/diagnosis-criteria-overviews.json';

test('exact clinical mappings provide sourced summaries without applying GAD or MDD criteria to unspecified/other conditions',()=>{
 const gad=diagnosticReference('F41.1')!;
 expect(gad.criteria?.title).toBe('Generalized anxiety disorder');
 expect(gad.criteria?.summary).toMatch(/six months/);
 expect(gad.criteria?.source.url).toMatch(/^https:\/\/www.nimh.nih.gov/);
 expect(diagnosticReference('F41.9')?.criteria).toBeNull();
 expect(diagnosticReference('F32.A')?.criteria).toBeNull();
 expect(diagnosticReference('Z63.0')?.criteriaReason).toContain('circumstance');
 expect(diagnosticReference('R45.851')?.criteriaReason).toContain('symptom');
 expect(diagnosticReference('INVALID')).toBeNull();
});
test('official parent sequencing notes are inherited; associated codes can be available or absent without fabricating catalog entries',()=>{
 const mild=diagnosticReference('F06.70')!;
 expect(mild.coding.some(note=>note.kind==='codeFirst'&&note.scope==='F06')).toBe(true);
 expect(mild.coding.some(note=>note.kind==='codeFirst'&&note.scope==='F06.7')).toBe(true);
 expect(mild.related.find(group=>group.expression==='F06.31')?.choices.map(choice=>choice.code)).toEqual(['F06.31']);
 expect(mild.related.find(group=>group.expression==='G30.-')?.choices).toEqual([]);
 expect(mild.dsmAdvisories).toHaveLength(1);
 const delirium=diagnosticReference('F05')!;
 expect(delirium.related.some(group=>group.expression==='F03.9-'&&group.choices.some(choice=>choice.code==='F03.90'))).toBe(true);
});
test('exclusion references remain separate from add-code suggestions',()=>{
 const gad=diagnosticReference('F41.1')!;
 expect(gad.coding.some(note=>note.kind==='excludes2'&&note.text.includes('F43.0'))).toBe(true);
 expect(gad.related).toEqual([]);
});
test('coverage distinguishes current missing codes from historical/parent codes and never claims all literal references are diagnoses',()=>{
 const catalog=new Set(diagnosisCatalog.rows.map(row=>row.code));
 expect(diagnosisCoverage.missingCurrentCodes).toHaveLength(70);
 expect(diagnosisCoverage.historicalOrCategoryCodes).toHaveLength(33);
 expect(diagnosisCoverage.presentCodes+70+33).toBe(diagnosisCoverage.comparedCodes);
 expect(diagnosisCoverage.missingCurrentCodes.every(row=>!catalog.has(row.code))).toBe(true);
 expect(diagnosisCoverage.missingCurrentCodes.some(row=>row.code==='G30.9')).toBe(true);
 expect(diagnosisCoverage.historicalOrCategoryCodes.find(row=>row.code==='F50.2')?.availableDescendants.length).toBeGreaterThan(0);
 expect(coverageText()).toContain('not a diagnosis-name/specifier completeness audit');
 expect(coverageText()).toContain('G30.9');
});
test('every overview mapping has a source and matches at least one available catalog choice',()=>{
 for(const profile of overviews.profiles){
  expect(overviews.sources[profile.source as keyof typeof overviews.sources]?.url).toMatch(/^https:\/\//);
  const code=new RegExp(profile.pattern),label=profile.labelPattern?new RegExp(profile.labelPattern,'i'):null;
  expect(diagnosisCatalog.rows.some(row=>code.test(row.code)&&(!label||label.test(row.label))),profile.id).toBe(true);
 }
});
