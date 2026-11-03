import definition from './tier-one-definition.json';
export const TIER_ONE = definition;
export const DEFINITION_SHA256 = "8e853baab940f0e84584995f4a7270e579e840046acd7e848a92be50597d09b2";
export const DRAFT_KEY = 'dsm_tier1_draft_v1';
// Compatibility handoff consumed by the existing administrator-only Tier 2 modules.
export const HANDOFF_KEY = 'asq_level1_payload';
export type Definition = typeof definition;
export type ScreenProfile={id:'adult'|'adolescent'|'parent';title:string;definition:Definition;hash:string;draftKey:string;handoffKey:string;scopeLabel:string;populationLabel:string;respondent:'self'|'parent';ageBand:string};
export const ADULT_PROFILE:ScreenProfile={id:'adult',title:'Adult self-report',definition:TIER_ONE,hash:DEFINITION_SHA256,draftKey:DRAFT_KEY,handoffKey:'dsm_tier1_adult_completed_v1',scopeLabel:'I am previewing the adult self-report version for someone aged 18 or older.',populationLabel:'ages 18 and older · adult self-report',respondent:'self',ageBand:'18+'};
const needsReview=(v:string)=>['Unsure','Not observed / do not know','Prefer to discuss privately'].includes(v);
export type Answers = Record<string, string>;
export type DomainResult = {id: string; title: string; path: string; answered: number; status: 'unanswered' | 'incomplete' | 'follow-up' | 'review' | 'no-concern'; reasons: string[]};
const questions=(profile:ScreenProfile)=>[...profile.definition.safety,...profile.definition.domains.flatMap(d=>d.questions)];
export function validAnswers(value: unknown, profile:ScreenProfile=ADULT_PROFILE): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id,v])=>questions(profile).some(q=>q.id===id) && typeof v==='string' &&
    (profile.definition.safety.some(q=>q.id===id)?profile.definition.safetyChoices:profile.definition.choices).includes(v));
}
export function domainResults(answers: Answers, profile:ScreenProfile=ADULT_PROFILE): DomainResult[] {
  return profile.definition.domains.map(d=>{
    const values=d.questions.map(q=>answers[q.id]);
    const answered=values.filter(Boolean).length;
    const concerns=d.questions.filter(q=>['Yes, currently','Yes, in the past'].includes(answers[q.id]));
    const review=d.questions.filter(q=>needsReview(answers[q.id]));
    const status=concerns.length?'follow-up':review.length?'review':answered===0?'unanswered':answered<d.questions.length?'incomplete':'no-concern';
    return {id:d.id,title:d.title,path:d.path,answered,status,reasons:[...concerns,...review].map(q=>q.text+' — '+answers[q.id])};
  });
}
export function evaluateTierOne(answers: Answers, adultConfirmed: boolean, profile:ScreenProfile=ADULT_PROFILE) {
  if (!validAnswers(answers,profile)) throw new Error('Invalid Tier 1 answers');
  const domains=domainResults(answers,profile);
  const allQuestions=questions(profile);
  const answered=allQuestions.filter(q=>answers[q.id]).length;
  const complete=adultConfirmed && answered===allQuestions.length;
  const safetyFlag=profile.definition.safety.some(q=>answers[q.id]==='Yes');
  const safetyReview=profile.definition.safety.some(q=>needsReview(answers[q.id]));
  return {complete,answered,total:allQuestions.length,safetyFlag,safetyReview,domains,
    routedDomains:complete?domains.filter(d=>d.status==='follow-up').map(d=>d.id):[],
    reviewDomains:profile.definition.domains.filter(d=>d.questions.some(q=>needsReview(answers[q.id]))).map(d=>d.id)};
}
export function createHandoff(answers: Answers, adultConfirmed: boolean, profile:ScreenProfile=ADULT_PROFILE) {
  const result=evaluateTierOne(answers,adultConfirmed,profile);
  if (!result.complete) throw new Error('Complete all Tier 1 questions before continuing');
  return {instrumentId:profile.definition.id,version:profile.definition.version,routingVersion:profile.definition.routingVersion,definitionHash:profile.hash,profileId:profile.id,respondent:profile.respondent,ageBand:profile.ageBand,populationConfirmed:adultConfirmed,
    completedAt:new Date().toISOString(),adultConfirmed:profile.id==='adult'&&adultConfirmed,answers:{...answers},...result};
}
export function readHandoff(raw: string|null, profile:ScreenProfile=ADULT_PROFILE): ReturnType<typeof createHandoff>|null {
  try {
    const p=JSON.parse(raw||'null');
    if (p?.instrumentId!==profile.definition.id || p.version!==profile.definition.version || p.definitionHash!==profile.hash || p.routingVersion!==profile.definition.routingVersion || (p.populationConfirmed??p.adultConfirmed)!==true || ((p.profileId!==undefined||profile.id!=='adult')&&(p.profileId!==profile.id||p.respondent!==profile.respondent||p.ageBand!==profile.ageBand)) || !validAnswers(p.answers,profile)) return null;
    const derived=evaluateTierOne(p.answers,true,profile);
    if (!derived.complete) return null;
    // Recompute routes; never trust a caller-supplied routedDomains array.
    return {...p,...derived};
  } catch {return null;}
}
