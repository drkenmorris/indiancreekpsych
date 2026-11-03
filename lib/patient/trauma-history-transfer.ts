/** Preparation only: no transport, patient matching, saving or clinical-record overwrite. */
import {TRAUMA_CHECKLIST_KEY,parseTraumaHistory,traumaHistoryDefinition} from './trauma-history';
export function prepareTraumaHistoryTransfer(answers:Record<string,string>){
 const value=answers[TRAUMA_CHECKLIST_KEY];
 if(!value?.trim())return null;
 const checklist=parseTraumaHistory(value);
 return {source_field:TRAUMA_CHECKLIST_KEY,definition_version:checklist.definition_version,target_action:'biopsychosocial_trauma_history' as const,selections:checklist.selections,unanswered_groups:traumaHistoryDefinition.groups.filter(g=>!checklist.selections[g.key].length).map(g=>g.key)};
}
