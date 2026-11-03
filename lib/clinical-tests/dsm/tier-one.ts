import definition from './tier-one-definition.json';
export const TIER_ONE = definition;
export const DEFINITION_SHA256 = "8e853baab940f0e84584995f4a7270e579e840046acd7e848a92be50597d09b2";
export const DRAFT_KEY = 'dsm_tier1_draft_v1';
// Compatibility handoff consumed by the existing administrator-only Tier 2 modules.
export const HANDOFF_KEY = 'asq_level1_payload';
export type Answers = Record<string, string>;
export type DomainResult = {id: string; title: string; path: string; answered: number; status: 'unanswered' | 'incomplete' | 'follow-up' | 'review' | 'no-concern'; reasons: string[]};
const allQuestions = [...TIER_ONE.safety,...TIER_ONE.domains.flatMap(d=>d.questions)];
export function validAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id,v])=>allQuestions.some(q=>q.id===id) && typeof v==='string' &&
    (TIER_ONE.safety.some(q=>q.id===id)?TIER_ONE.safetyChoices:TIER_ONE.choices).includes(v));
}
export function domainResults(answers: Answers): DomainResult[] {
  return TIER_ONE.domains.map(d=>{
    const values=d.questions.map(q=>answers[q.id]);
    const answered=values.filter(Boolean).length;
    const concerns=d.questions.filter(q=>['Yes, currently','Yes, in the past'].includes(answers[q.id]));
    const review=d.questions.filter(q=>['Unsure','Prefer to discuss privately'].includes(answers[q.id]));
    const status=concerns.length?'follow-up':review.length?'review':answered===0?'unanswered':answered<d.questions.length?'incomplete':'no-concern';
    return {id:d.id,title:d.title,path:d.path,answered,status,reasons:[...concerns,...review].map(q=>q.text+' — '+answers[q.id])};
  });
}
export function evaluateTierOne(answers: Answers, adultConfirmed: boolean) {
  if (!validAnswers(answers)) throw new Error('Invalid Tier 1 answers');
  const domains=domainResults(answers);
  const answered=allQuestions.filter(q=>answers[q.id]).length;
  const complete=adultConfirmed && answered===allQuestions.length;
  const safetyFlag=TIER_ONE.safety.some(q=>answers[q.id]==='Yes');
  const safetyReview=TIER_ONE.safety.some(q=>['Unsure','Prefer to discuss privately'].includes(answers[q.id]));
  return {complete,answered,total:allQuestions.length,safetyFlag,safetyReview,domains,
    routedDomains:complete?domains.filter(d=>d.status==='follow-up').map(d=>d.id):[],
    reviewDomains:TIER_ONE.domains.filter(d=>d.questions.some(q=>['Unsure','Prefer to discuss privately'].includes(answers[q.id]))).map(d=>d.id)};
}
export function createHandoff(answers: Answers, adultConfirmed: boolean) {
  const result=evaluateTierOne(answers,adultConfirmed);
  if (!result.complete) throw new Error('Complete all Tier 1 questions before continuing');
  return {instrumentId:TIER_ONE.id,version:TIER_ONE.version,routingVersion:TIER_ONE.routingVersion,definitionHash:DEFINITION_SHA256,
    completedAt:new Date().toISOString(),adultConfirmed,answers:{...answers},...result};
}
export function readHandoff(raw: string|null): ReturnType<typeof createHandoff>|null {
  try {
    const p=JSON.parse(raw||'null');
    if (p?.instrumentId!==TIER_ONE.id || p.version!==TIER_ONE.version || p.definitionHash!==DEFINITION_SHA256 || p.routingVersion!==TIER_ONE.routingVersion || p.adultConfirmed!==true || !validAnswers(p.answers)) return null;
    const derived=evaluateTierOne(p.answers,true);
    if (!derived.complete) return null;
    // Recompute routes; never trust a caller-supplied routedDomains array.
    return {...p,...derived};
  } catch {return null;}
}
