import {createHash} from 'node:crypto';
import {createClinicalSessionStore} from '@/lib/clinical-tests/clinicalSessionStore';
import {activePlan,progressRecords,TRACKER_KEY} from '@/lib/clinical-tests/dsm/tier-two-progress';
import {evidenceItems,evidenceRecord} from '@/lib/clinical-tests/dsm/evidence';
import {prepareReportCopies} from '@/lib/clinical-tests/dsm/report-copies';
import evidence from '@/lib/clinical-tests/dsm/tier-two-versions.json';
import differential from '@/lib/clinical-tests/dsm/differential-version.json';
import review from '@/lib/clinical-tests/dsm/review-version.json';
export const snapshotProvenance={format:'icps-dsm-record/1',evidence,differential,review};
export function stableJson(value:unknown):string{if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+stableJson(v)).join(',')+'}';return JSON.stringify(value)??'null';}
export function snapshotHash(value:unknown){return createHash('sha256').update(stableJson(value)).digest('hex');}
export function buildDsmSnapshot(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value)||Buffer.byteLength(JSON.stringify(value))>7500000)throw Error('DSM state is invalid or too large.');
 const state=value as Record<string,string>,storage=createClinicalSessionStore();storage.importDsm(state);
 for(const text of Object.values(state)){const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object')throw Error('Invalid DSM state entry.');}
 const plan=activePlan(storage);
 if(plan&&state[TRACKER_KEY]){const raw=JSON.parse(state[TRACKER_KEY]);if(raw.attempt===plan.key){
  const accepted=progressRecords(plan,storage);
  for(const [id,r] of Object.entries(raw.modules??{}) as [string,ReturnType<typeof evidenceRecord>][]) {
   if(!accepted[id])throw Error('Saved Tier 2 module is incompatible. Review the module before saving.');
   const items=evidenceItems(id);if(!items.length||Object.entries(r.answers).some(([id,v])=>!Number.isInteger(v)||!items.some(q=>q.id===id&&Number(v)>=0&&Number(v)<q.choices.length)))throw Error('Invalid Tier 2 response.');
   const canonical=evidenceRecord(id,r.answers as Record<string,number>,!!r.completedAt);
   if(stableJson(r.definition)!==stableJson(canonical.definition)||stableJson(r.requiredIds)!==stableJson(canonical.requiredIds)||stableJson(r.findings)!==stableJson(canonical.findings))throw Error('Tier 2 findings or definitions do not match the recorded answers.');
  }
 }}
 const report=plan?prepareReportCopies(plan,progressRecords(plan,storage),storage).provider.report:{version:'dsm-draft/1',status:'Tier 1 in progress',clinicalReviewRequired:true,diagnosesConfirmed:false};
 const content={state,report,provenance:snapshotProvenance};
 return {...content,contentHash:snapshotHash(content)};
}
