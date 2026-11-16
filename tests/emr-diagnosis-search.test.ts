import {expect,test} from 'vitest';
import {searchDiagnosticReferences} from '@/lib/emr/diagnosis-search';
import index from '@/lib/emr/diagnosis-search-index.json';
test('government search finds diagnostic overview and coding instructions with original anchors',()=>{
 const clinical=searchDiagnosticReferences('GAD','nimh');
 expect(clinical.total).toBe(9);
 expect(clinical.results.some(item=>item.url.endsWith('#part_6119')&&item.excerpt.includes('6 months'))).toBe(true);
 const coding=searchDiagnosticReferences('"use additional code"','icd');
 expect(coding.total).toBeGreaterThan(0);
 expect(coding.results.every(item=>item.url.includes('#page=')&&item.source==='icd')).toBe(true);
 expect(coding.results[0].page).not.toBe(2); // Instructions rank above table-of-contents entries.
});
test('APA matches navigation topics without indexing copyrighted passages',()=>{
 const results=searchDiagnosticReferences('bipolar','apa');
 expect(results.total).toBe(1);
 expect(results.results[0]).toMatchObject({kind:'topic',page:6});
 expect(results.results[0].excerpt).toContain('Topic link');
 expect(index.documents.filter(item=>item.source==='apa').every(item=>item.text.startsWith('Topic link'))).toBe(true);
 expect(searchDiagnosticReferences('generalized anxiety','apa').total).toBe(0);
});
test('filters, all-term matching, quotation, empty results and pagination retain honest scope',()=>{
 expect(searchDiagnosticReferences('unicorn unsupported diagnosis').total).toBe(0);
 expect(searchDiagnosticReferences('and the').total).toBe(0);
 expect(searchDiagnosticReferences('anxiety unicorn','nimh').total).toBe(0);
 const first=searchDiagnosticReferences('code','icd');
 const next=searchDiagnosticReferences('code','icd',10);
 expect(first.total).toBeGreaterThan(10);
 expect(next.offset).toBe(10);
 expect(first.results.some(item=>next.results.some(other=>item.id===other.id))).toBe(false);
 expect(index.documents.filter(item=>item.source==='icd')).toHaveLength(121);
 expect(index.sources.find(item=>item.id==='icd')?.attribution).toContain('does not imply endorsement');
 expect(index.documents.every(item=>/^https:\/\/(www.nimh.nih.gov|www.cms.gov|www.psychiatry.org)\//.test(item.url))).toBe(true);
});
