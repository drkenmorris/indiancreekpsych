import manifest from './source-manifest.json';
import {SELF_ESTEEM_LIKERT_ITEMS,SELF_ESTEEM_FORCED_CHOICE} from '../legacy/selfesteem/selfEsteemItemBank';
import {srrciItems} from '../legacy/src/features/assessments/srrci/data/srrciItems';
import {SRRCI_RESPONSE_OPTIONS} from '../legacy/src/features/assessments/srrci/types/srrciTypes';
import {RTAFI_ITEMS} from '../legacy/src/features/psychometrics/rtafi/data/rtafiItems';
import {RTAFI_RESPONSE_OPTIONS} from '../legacy/src/features/psychometrics/rtafi/types/rtafiTypes';
import {rdiiItemsFormA} from '../legacy/src/assessments/rdii/rdiiItemsFormA';
import {rvtiItemBank} from '../legacy/src/assessments/rvti/rvtiItemBank';
export const connectedKeys=['cseq','srrci','rtafi','rdii','rvti'] as const;
export type ConnectedKey=typeof connectedKeys[number];
export const isConnectedKey=(v:unknown):v is ConnectedKey=>typeof v==='string'&&connectedKeys.includes(v as ConnectedKey);
export type Answer=number|string;
export type Answers=Record<string,Answer>;
export type Option={value:Answer;label:string};
export type Question={id:string;text:string;domain:string;options:Option[]};
export type Definition={format:'icps-connected/1';testKey:ConnectedKey;title:string;introduction:string[];instructions:string;pageSize:7;version:string;items:Question[]};
const options=(labels:string[],start=0):Option[]=>labels.map((label,i)=>({value:i+start,label}));
const frequency=SRRCI_RESPONSE_OPTIONS;
const titles:Record<ConnectedKey,string>={cseq:'CSEQ Self-Esteem',srrci:'SRRCI-X Relationship',rtafi:'RTAFI Attachment',rdii:'RDII Relationship',rvti:'RVTI Values'};
const introductions:Record<ConnectedKey,string[]>={
 cseq:['The Comprehensive Self-Esteem Quotient questionnaire explores how you experience personal worth, confidence, self-acceptance, boundaries, and resilience when facing stress or disappointment. It also asks about approval, perfectionism, comparison, and patterns that may support or undermine self-esteem.','Choose how true each statement is for you. In the paired statements, choose the one that fits you better, even if neither fits perfectly. Your therapist will discuss your responses with you; there are no passing or failing answers.'],
 srrci:['SRRCI-X explores sexual self-regulation and relationship experiences, including desire, emotional coping, communication, boundaries, consent, values, and repair. Some questions concern private or sensitive experiences. Your own perspective helps your therapist identify subjects for a thoughtful conversation.','Choose how often each statement is true for you. Answer independently and as honestly as you can, using your typical experience rather than an ideal answer. If a question does not fit your circumstances or feels difficult to answer, contact your therapist rather than guessing.'],
 rtafi:['RTAFI explores reported stress reactions, emotional safety, attachment and trust, family experiences, regulation, and protective resources. It can help organize discussion of experiences that affect closeness, safety, and coping; it cannot determine whether a particular event happened or establish a diagnosis.','Choose how often each statement is true for you in the relationships and family context you and your therapist are reviewing. Use a consistent context throughout. You may save your place and take a break. Ask your therapist for help if a question is unclear or distressing.'],
 rdii:['RDII Form A is a self-report of relationship patterns: respectful conduct, emotional connection, commitment, dependency, conflict, and responses to strain. It helps your therapist explore both reported resources and areas that may need further assessment.','Answer about your own usual behavior and experience in the relationship you are discussing with your therapist. Choose the response that fits best using the six-point scale. This is your individual account; it does not establish your partner’s intentions or a couple’s compatibility.'],
 rvti:['RVTI explores relationship values across sexual exclusivity, finances, autonomy and togetherness, and children or parenting. It asks about the importance of those values and how you imagine responding to disagreements or difficult scenarios.','For statements, choose your level of agreement; for importance questions, rate importance from 1 to 10. For scenarios, rate the specific feeling or likelihood asked about, and choose a time span when requested. Imagine the situation as written. Values are personal: higher scores do not mean better values.']
};
export function connectedDefinition(key:ConnectedKey):Definition{
 let items:Question[]=[];
 if(key==='cseq')items=[...SELF_ESTEEM_LIKERT_ITEMS.map(i=>({id:String(i.id),text:i.text,domain:'Self-esteem statements',options:options(['Not true','Mostly untrue','Mostly true','Very true'])})),...SELF_ESTEEM_FORCED_CHOICE.map(i=>({id:i.id,text:'Choose the statement that fits you better.',domain:'Paired statements',options:[{value:'A',label:i.a},{value:'B',label:i.b}]}))];
 if(key==='srrci')items=srrciItems.map(i=>({id:i.id,text:i.text,domain:i.domain,options:frequency}));
 if(key==='rtafi')items=RTAFI_ITEMS.map(i=>({id:i.id,text:i.prompt,domain:i.domain,options:RTAFI_RESPONSE_OPTIONS}));
 if(key==='rdii')items=rdiiItemsFormA.map(i=>({id:String(i.id),text:i.text,domain:i.domain,options:options(['Never / Strongly Disagree','Rarely','Sometimes','Often','Very Often','Always / Strongly Agree'],1)}));
 if(key==='rvti')items=rvtiItemBank.map(i=>({id:i.id,text:i.prompt,domain:i.domain,options:i.scale==='TIME_TOLERANCE'?['IMMEDIATE','WITHIN_6_MONTHS','WITHIN_1_2_YEARS','WITHIN_3_5_YEARS','INDEFINITELY'].map((value,n)=>({value,label:['Immediately','Within 6 months','Within 1–2 years','Within 3–5 years','Indefinitely'][n]})):Array.from({length:i.scale==='IMPORTANCE_1_10'?10:7},(_,n)=>({value:n+1,label:i.scale==='IMPORTANCE_1_10'?`${n+1}${n===0?' — Not important':n===9?' — Extremely important':''}`:`${n+1}${n===0?' — '+(i.followupRole==='SEVERITY'?'Not disturbing':i.followupRole==='LIKELIHOOD'?'Very unlikely':'Strongly disagree'):n===6?' — '+(i.followupRole==='SEVERITY'?'Extremely disturbing':i.followupRole==='LIKELIHOOD'?'Very likely':'Strongly agree'):''}`}))}));
 return {format:'icps-connected/1',testKey:key,title:titles[key],introduction:introductions[key],instructions:'Answer independently. Save progress before closing. Seven questions appear per page. Results support a conversation with your therapist and do not establish a diagnosis.',pageSize:7,version:'2026-11-04.1/'+manifest.digest,items};
}
export function validateSave(v:unknown,d:Definition){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid save request.');const b=v as Record<string,unknown>;
 if(!Number.isInteger(b.expectedRevision)||(b.expectedRevision as number)<0||!Number.isInteger(b.page)||(b.page as number)<0||(b.page as number)>=Math.ceil(d.items.length/7)||typeof b.submit!=='boolean'||b.identityConfirmed!==true)throw Error('Confirm the named recipient and use a valid page.');
 if(!b.answers||typeof b.answers!=='object'||Array.isArray(b.answers))throw Error('Invalid answers.');
 const answers=b.answers as Answers,byId=new Map(d.items.map(i=>[i.id,i]));
 if(Object.entries(answers).some(([id,value])=>!byId.get(id)?.options.some(o=>o.value===value)))throw Error('Unknown question or invalid response.');
 if(d.items.slice(0,(b.page as number)*7).some(i=>answers[i.id]===undefined))throw Error('Answer earlier pages before advancing.');
 if(b.submit&&d.items.some(i=>answers[i.id]===undefined))throw Error('Answer every question before submitting.');
 return {answers,page:b.page as number,submit:b.submit as boolean,expectedRevision:b.expectedRevision as number};
}
