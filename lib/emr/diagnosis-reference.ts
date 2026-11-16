import catalog from './diagnosis-catalog.json';
import overviewData from './diagnosis-criteria-overviews.json';
import codingData from './diagnosis-coding-notes.json';

export type CatalogChoice = (typeof catalog.rows)[number];
export type CodingNote = {kind:string;title:string;scope:string;text:string};
export type ReferenceSource = {title:string;url:string};
export type DiagnosticReference = {
 code:string;label:string;checkedOn:string;notice:string;
 criteria: {title:string;summary:string;scope:string;source:ReferenceSource;context?:string}|null;
 criteriaReason:string;
 coding:CodingNote[];codingSource:ReferenceSource;
 dsmAdvisories:{text:string;source:ReferenceSource}[];
 related:{expression:string;choices:CatalogChoice[]}[];
};
const catalogByCode = new Map(catalog.rows.map(row=>[row.code,row]));
const profiles = overviewData.profiles.map(profile=>({...profile,
 matcher:new RegExp(profile.pattern),labelMatcher:profile.labelPattern?new RegExp(profile.labelPattern,'i'):null,
}));
const apaUpdate:ReferenceSource={title:'APA cumulative DSM-5-TR coding updates through September 2025',url:'https://www.psychiatry.org/getmedia/b68a5776-f88c-45c7-9535-fd219d7aa5cb/APA-DSM5TR-Update-September-2025.pdf'};
const scopes=codingData.scopes as Record<string,CodingNote[]>;
const codeScopes=codingData.codeScopes as Record<string,string[]>;
const normalize=(code:string)=>code.replaceAll('.','');
function relatedExpressions(notes:CodingNote[]) {
 const expressions = new Map<string,{expression:string;choices:CatalogChoice[]}>();
 function add(expression:string,start:string,end?:string,prefix=false) {
  const choices=end?catalog.rows.filter(row=>normalize(row.code)>=normalize(start)&&normalize(row.code)<=normalize(end)+'\uffff')
   :prefix?catalog.rows.filter(row=>normalize(row.code).startsWith(normalize(start)))
   :catalogByCode.has(start)?[catalogByCode.get(start)!]:[];
  if(!expressions.has(expression))expressions.set(expression,{expression,choices});
 }
 for(const note of notes.filter(note=>['codeFirst','codeAlso','useAdditionalCode'].includes(note.kind))) {
  const remaining=note.text.replace(/\b([A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?)(?:\.-)?\s*-\s*([A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?)(?:\.-|-)?/g,(text,start,end)=>{add(text,start,end);return '';});
  for(const match of remaining.matchAll(/\b([A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?)(\.-|-)?/g)){
   const code=match[1];add(match[0],code,undefined,!!match[2]||(!catalogByCode.has(code)&&catalog.rows.some(row=>normalize(row.code).startsWith(normalize(code)))));
  }
 }
 return [...expressions.values()];
}
export function diagnosticReference(code:string):DiagnosticReference|null {
 const choice=catalogByCode.get(code);
 if(!choice)return null;
 const profile=profiles.find(profile=>profile.matcher.test(code)&&(!profile.labelMatcher||profile.labelMatcher.test(choice.label)));
 const criteria=profile?{title:profile.title,summary:profile.summary,scope:profile.scope,
  source:overviewData.sources[profile.source as keyof typeof overviewData.sources],
  ...(profile.source==='personality'?{context:overviewData.personalityContext}:{}),
 }:null;
 const coding=(codeScopes[code]??[]).flatMap(scope=>scopes[scope]??[]);
 const dsmAdvisories:DiagnosticReference['dsmAdvisories']=[];
 if(/^F1[0-9]\./.test(code))dsmAdvisories.push({text:'Substance-induced diagnoses may use a combination code reflecting both the use disorder and induced condition. Review the substance, severity, timing and manifestation before adding a separate use-disorder code.',source:apaUpdate});
 if(/^F06\.7/.test(code))dsmAdvisories.push({text:'For mild neurocognitive disorder, review coding for clinically significant psychiatric symptoms caused by the same medical condition when appropriate. Establish each condition separately; examples include F06.31 and F06.4.',source:apaUpdate});
 if(/^F0[123]\./.test(code))dsmAdvisories.push({text:'Review current neurocognitive coding for etiology, severity, and behavioral or psychological features. Older broad codes may require more specific descendants; do not reuse a historical mapping without checking the current update.',source:apaUpdate});
 const extra=code.startsWith('F06.7')?[{kind:'codeAlso',title:'APA advisory examples',scope:'Mild neurocognitive disorder',text:'F06.31, F06.4'}]:[];
 return {code,label:choice.label,checkedOn:overviewData.sourceCheckedOn,notice:overviewData.notice,criteria,
  criteriaReason:code.startsWith('Z')?'This is a circumstance/encounter code; a DSM disorder criteria set is not implied. Document the applicable circumstance.'
   :code.startsWith('R')?'This records a symptom or observation. It does not by itself establish a DSM disorder.'
   :'A verified diagnosis-specific criteria overview is not yet available for this exact selection. Consult the current clinical reference; the code description is not a criteria set.',
  coding,codingSource:{title:'CDC/NCHS FY2027 ICD-10-CM Tabular List (including parent instructions)',url:codingData.source},dsmAdvisories,
  related:relatedExpressions([...coding,...extra]).filter(group=>group.expression!==code),
 };
}
