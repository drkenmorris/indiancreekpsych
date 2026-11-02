import definition from './legal-routing-definition.json';
export const LEGAL_ROUTING_KEY='legal_routing_answers';
export const LEGAL_ROUTING_DEFINITION=definition;
export type RoutingAnswers=Record<string,string>;
export function parseLegalRouting(value:string):RoutingAnswers|null{
 if(!value)return {};
 try{const p=JSON.parse(value);if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='answers,version'||p.version!==definition.version||!p.answers||typeof p.answers!=='object'||Array.isArray(p.answers))return null;
 for(const [key,v] of Object.entries(p.answers)){const q=definition.questions.find(q=>q.id===key);if(!q||typeof v!=='string'||!['',...q.options].includes(v))return null;}return p.answers;}catch{return null;}
}
export function encodeLegalRouting(answers:RoutingAnswers){return JSON.stringify({version:definition.version,answers});}
export function validateLegalRouting(value:string,complete=false){if(value.length>4000)return 'Legal forms questionnaire is too long.';const a=parseLegalRouting(value);if(a===null)return 'Legal forms questionnaire is invalid or uses an unavailable version.';if(complete&&definition.questions.some(q=>!a[q.id]))return 'Complete the page 10 legal forms questions; choose Unsure when you need office help.';return null;}
export function legalRoutingResults(value:string){const a=parseLegalRouting(value);if(a===null)return null;return definition.forms.map(f=>{
 let status='Required practice step',reason='Review before routine therapy; follow up with the office if you request discussion.';
 if(f.id==='privacy_notice'){status='Notice for everyone; signature optional';reason='Receive the notice; the office requests acknowledgment and records any refusal.';}
 else if(f.id==='attestation'){status='Required for online submission';reason='Attest to your answers and intent to submit; does not replace other consents.';}
 else if(['telehealth','electronic','representative','release','part2','sud_notes','psychotherapy_notes'].includes(f.id)){
 const key=f.id==='psychotherapy_notes'?'psychotherapy_notes':f.id;
 const choice=a[key];const optional=['release','psychotherapy_notes'].includes(f.id),outside=['part2','sud_notes'].includes(f.id);
 if(!choice||choice==='Unsure'){status='Office review needed';reason='This question is unanswered or uncertain; the office should help determine applicability.';}
 else if(outside){status=choice==='No'?'Not needed based on answers':'Office review needed';reason=choice==='No'?'No office request for these outside protected records was reported.':'The office must confirm applicable protected records and any separate consent needed.';}
 else if(choice==='Yes'){status=optional?'Optional — requested':'Necessary for selected service';reason=optional?'You requested discussion of a specific optional release. Complete only if you choose to authorize it.':'Complete before using the selected service or acting as a representative; office verification may be needed.';}
 else{status=optional?'Optional — not requested':'Not needed based on answers';reason=optional?'No optional release was requested; no permission is created.':'This service or representative situation was not selected.';}
 if(f.id==='representative'&&(a.minor!=='No')&&choice!=='Yes'){status='Office review needed';reason='Patient age/minor status needs office review of who may consent. Do not assume a parent or other person has authority.';}
 }
 return {...f,status,reason};});}
