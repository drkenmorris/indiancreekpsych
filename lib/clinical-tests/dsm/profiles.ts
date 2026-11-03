import adolescent from './tier-one-adolescent.json';
import parent from './tier-one-parent.json';
import {ADULT_PROFILE,type ScreenProfile} from './tier-one';
export const SELECTION_KEY='dsm_tier1_selection_v1';
export type AgeBand='under6'|'6-10'|'11-17'|'18+';
export type Respondent='self'|'parent';
export const ADOLESCENT_PROFILE:ScreenProfile={id:'adolescent',title:'Adolescent self-report',definition:adolescent,hash:"bbbf3d4247001347f86e32032152e2d7ee3baf4391a005ec1767ccfbf52b079b",draftKey:'dsm_tier1_adolescent_11_17_draft_v1',handoffKey:'dsm_tier1_adolescent_11_17_completed_v1',scopeLabel:'I am previewing adolescent self-report for someone aged 11–17.',populationLabel:'ages 11–17 · adolescent self-report',respondent:'self',ageBand:'11-17'};
export function parentProfile(ageBand:'6-10'|'11-17'):ScreenProfile{return {id:'parent',title:'Parent/guardian report',definition:parent,hash:"c0fbf03c89e2b88b8cb7a520cb46635e723fb5292150d38a31d76eb841d902b0",draftKey:`dsm_tier1_parent_${ageBand}_draft_v1`,handoffKey:`dsm_tier1_parent_${ageBand}_completed_v1`,scopeLabel:`I am previewing parent/guardian observations for a child aged ${ageBand}.`,populationLabel:`child ages ${ageBand} · parent/guardian report`,respondent:'parent',ageBand};}
export function appropriateProfile(age: string,respondent:string):ScreenProfile|null{
 if(respondent==='self'&&age==='18+')return ADULT_PROFILE;
 if(respondent==='self'&&age==='11-17')return ADOLESCENT_PROFILE;
 if(respondent==='parent'&&(age==='6-10'||age==='11-17'))return parentProfile(age);
 return null;
}
