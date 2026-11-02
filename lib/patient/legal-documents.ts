/** Original practice documents. Retain every released text revision for completed-record copies. */
import current from './legal-packet-directory-1.json';
import november from './legal-packet-2026-11-02.json';
import previous from './legal-packet-2026-10-11.json';
export const LEGAL_PACKET_VERSION=current.version;
export type LegalDocument={title:string;summary:string;parts:readonly {heading:string;paragraphs:readonly string[]}[]};
export const legalDocuments:Record<string,LegalDocument>=current.documents;
export const legalForms=current.forms;
export function documentsForVersion(version:string):Record<string,LegalDocument>|null{return version===current.version?current.documents:version===november.version?november.documents:version===previous.version?previous.documents:null;}
export function formsForVersion(version=LEGAL_PACKET_VERSION){return version===current.version?current.forms:version===november.version?november.forms:version===previous.version?november.forms:[];}
export function legalFormFor(section:string,version=LEGAL_PACKET_VERSION){return formsForVersion(version).find(f=>f.section===section);}
export function legalDecision(section:string,answers:Record<string,string>){const f=legalFormFor(section);if(!f)return {label:'Not a legal form',signed:false};const choice=answers[f.choice]||'';if(!choice)return {label:'Decision not recorded',signed:false};if(choice!==f.positive)return {label:f.id==='representative'?'Representative not applicable':choice.includes('discuss')||choice.includes('clarification')?'Discussion / clarification requested':f.id==='electronic'?'Paper workflow requested':'Declined / not authorized',signed:false};return {label:answers[f.signature]?.trim()&&answers[f.date]?'Signature and date recorded':'Signature / date needed',signed:!!(answers[f.signature]?.trim()&&answers[f.date])};}
export function prepareLegalDraft(answers:Record<string,string>,submitted=false){if(submitted)return {...answers};if(!answers.legal_packet_version||answers.legal_packet_version===LEGAL_PACKET_VERSION)return {...answers,legal_packet_version:LEGAL_PACKET_VERSION};const copy:Record<string,string>={...answers,legal_packet_version:LEGAL_PACKET_VERSION};for(const f of legalForms){copy[f.choice]='';copy[f.signature]='';copy[f.date]='';}return copy;}
export function validateLegalDates(answers:Record<string,string>,today=new Date().toLocaleDateString('en-CA')){for(const f of legalForms){if(answers[f.choice]!==f.positive)continue;const value=answers[f.date];if(!value)continue;const parsed=new Date(value+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value||value>today)return `Enter a valid, nonfuture signature date for page ${f.page}.`;}return null;}

export type LegalField=readonly [key:string,label:string,...rest:unknown[]];
export function fieldsForVersion(version:string,section:string):readonly LegalField[]{const fields=(version===current.version?current.fields:version===november.version?november.fields:version===previous.version?previous.fields:null) as Record<string,unknown>|null;return (fields?.[section]??[]) as readonly LegalField[];}
