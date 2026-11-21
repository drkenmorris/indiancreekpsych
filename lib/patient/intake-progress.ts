import {intakeSections,type IntakeAnswers,validateIntake} from './intake';
import {LEGAL_ROUTING_KEY,LEGAL_ROUTING_DEFINITION,parseLegalRouting,validateLegalRouting} from './legal-routing';
import {hasMedication,parseMedications,validateMedications} from './medications';
import {hasTreatmentEntry,parseTreatmentHistory,validateTreatmentHistory} from './treatment-history';
import {parseMedicalSubstance} from './medical-substance';
import {parseTraumaHistory} from './trauma-history';

export const NOT_APPLICABLE='Not applicable';
const legalForms=LEGAL_ROUTING_DEFINITION.forms;
const disclosureFields:Record<number,string[]>={
 18:['roi_discloser','roi_recipient_name','roi_information_scope','roi_purpose','roi_expiration','roi_revocation_ack','roi_voluntary_ack'],
 19:['part2_discloser','part2_recipient','part2_scope','part2_purpose','part2_expiration','part2_revocation_ack'],
 20:['sud_notes_discloser','sud_notes_recipient','sud_notes_scope','sud_notes_purpose','sud_notes_expiration','sud_notes_revocation_ack'],
 21:['psych_notes_discloser','psych_notes_recipient','psych_notes_scope','psych_notes_purpose','psych_notes_expiration','psych_notes_revocation_ack']
};
export function requiredIntakePage(page:number,routing:string){
 if(page<=14)return true;
 const form=legalForms.find(form=>form.page===page);
 const answers=parseLegalRouting(routing);
 return !!form&&(answers?.[form.id]==='Yes'||(page===17&&answers?.minor==='Yes'));
}
export function narrativeMayBeSkipped(key:string,answers:IntakeAnswers){
 // Presenting concerns and treatment goals are mandatory clinical narratives.
 // A Not Applicable checkbox must not satisfy either required answer.
 if(key==='counseling_reason'||key==='counseling_goals')return false;
 if(key==='medication_allergy_notes')return answers.medication_allergy_status!=='Medication allergies reported';
 if(key==='violence_risk_details')return !['suicidal_thoughts_current','suicidal_plan_current','homicidal_thoughts_current','abuse_neglect_current','weapons_access'].some(field=>answers[field]==='Yes');
 if(key==='representative_authority')return answers.representative_signer!=='Parent/guardian/authorized representative';
 if(key==='part2_purpose_details')return answers.part2_authorize!=='Yes'||answers.part2_purpose!=='Specific purpose';
 return !Object.entries(disclosureFields).some(([page,fields])=>fields.includes(key)&&answers[legalForms.find(form=>form.page===Number(page))!.choice]==='Yes');
}

export function intakePageKeys(page:number){return intakeSections[page-1].fields.map(([key])=>key);}

export function intakePageReady(page:number,answers:IntakeAnswers){
 const section=intakeSections[page-1];
 if(!section)return false;
 if(page===10)return !validateLegalRouting(answers[LEGAL_ROUTING_KEY]??'',true);
 const legal=legalForms.find(form=>form.page===page);
 if(legal){
  if(!answers[legal.choice])return false;
  if(answers[legal.choice]===legal.positive&&[legal.signature,legal.date,...(disclosureFields[page]??[]),...(page===17?['representative_name','representative_authority']:[])]
   .some(key=>!answers[key]?.trim()||answers[key]===NOT_APPLICABLE))return false;
 }
 const skipInsurance=page===3&&answers.insurance_coverage!=='insured';
 const pageAnswers=Object.fromEntries(intakePageKeys(page).map(key=>[key,answers[key]??'']));
 if(validateIntake({...pageAnswers,date_of_birth:answers.date_of_birth??''},false))return false;
 try{
  return section.fields.every(([key,,type,required])=>{
   const value=answers[key]?.trim()??'';
   if(skipInsurance&&key!=='insurance_coverage')return true;
   if(type==='textarea'){
    if(key==='medication_allergy_notes'&&answers.medication_allergy_status==='No known medication allergies')return !value;
    if(legal&&page>=17&&answers[legal.choice]!==legal.positive)return true;
    if(key==='part2_purpose_details'&&answers.part2_purpose!=='Specific purpose')return true;
    return !!value&&(value!==NOT_APPLICABLE||narrativeMayBeSkipped(key,answers));
   }
   if(type==='medications')return !!value&&!validateMedications(value,true)&&parseMedications(value).filter(hasMedication).every(entry=>!!entry.dosage.trim()&&!!entry.frequency.trim()&&!!entry.duration);
   if(type==='treatment-history')return !!value&&!validateTreatmentHistory(value,true)&&parseTreatmentHistory(value).filter(hasTreatmentEntry).every(entry=>!!entry.reason.trim()&&!!entry.outcome_notes.trim()&&(entry.reason!==NOT_APPLICABLE||!!entry.provider_facility.trim()));
   if(type==='medical-substance'){const data=parseMedicalSubstance(value);return Object.values(data.selections).every(items=>items.length>0)&&Object.entries(data.notes).every(([key,note])=>['primary_care_provider','pcp_phone'].includes(key)||!!note.trim());}
   if(type==='trauma-history')return !!value&&!!parseTraumaHistory(value);
   if(legal)return !required||!!value;
   if(key==='comm_voicemail_detail'&&answers.comm_voicemail!=='Yes')return true;
   return !(required||type==='select')||!!value;
  });
 }catch{return false;}
}
