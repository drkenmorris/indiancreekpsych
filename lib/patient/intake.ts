export const intakeSections = [
 {title:'Demographics and contact information',fields:[
  ['full_name','Full legal name','text',true],['preferred_name','Preferred name','text'],['date_of_birth','Date of birth','date',true],['pronouns','Pronouns (optional)','text'],
  ['address','Street address','text',true],['address2','Apartment / unit','text'],['city','City','text',true],['state','State / province','text',true],['postal_code','ZIP / postal code','text',true],
  ['phone','Phone number','tel',true],['email','Contact email','email',true],['contact_preference','Preferred contact method','select',false,['Email','Phone','Either']],['safe_voicemail','May we leave a voicemail?','select',false,['Yes','No']]
 ]},
 {title:'Insurance information',fields:[
  ['insurance_coverage','How will you pay for care?','select',true,['insured','self-pay','unsure']],
  ['insurance_carrier','Insurance carrier','text'],['insurance_member','Member / subscriber number','text'],['insurance_group','Group number','text'],['insurance_phone','Insurance carrier provider-services phone number','tel'],
  ['insurance_type','Insurance plan type','select',false,['PPO','POS','HMO','EPO','HDHP','Medicare','Medicaid','Other','I don’t know']],
  ['policyholder_name','Policyholder name (if different)','text'],['policyholder_relationship','Relationship to policyholder','text'],
  ['deductible','Annual deductible','text'],['deductible_met','Deductible met so far this plan year','text'],['copay','Copay per visit','text'],['coinsurance','Coinsurance percentage you pay','text'],['insurance_notes','Other insurance details or wording on your card','textarea']
 ]},
 {title:'What brings you to counseling?',fields:[
  ['counseling_reason','Briefly describe what you would like help with','textarea',true],['concern_duration','How long has this been affecting you?','text'],['counseling_goals','What would you like to achieve through counseling?','textarea']
 ]}
] as const;
export type IntakeAnswers=Record<string,string>;
export type IntakeRecord={patient_id:string;answers:IntakeAnswers;status:'draft'|'submitted';version:number;updated_at:string;submitted_at:string|null};
export const costFields=['deductible','deductible_met','copay','coinsurance'];
export function validateIntake(answers:IntakeAnswers,submit:boolean){
 for(const section of intakeSections)for(const f of section.fields){
  const value=answers[f[0]]??'';
  if(value.length>8000)return `${f[1]} is too long.`;
  if(submit&&f.length>3&&f[3]&&!value.trim())return `Please complete: ${f[1]}.`;
 }
 if(answers.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email))return 'Enter a valid contact email.';
 if(answers.date_of_birth&&answers.date_of_birth>new Date().toISOString().slice(0,10))return 'Date of birth cannot be in the future.';
 for(const k of costFields){const v=answers[k];if(v&&v!=='I don’t know'&&(!/^\d+(\.\d{1,2})?$/.test(v)||Number(v)<0||(k==='coinsurance'&&Number(v)>100)))return k==='coinsurance'?'Coinsurance must be between 0 and 100, or choose I don’t know.':'Enter a non-negative amount, or choose I don’t know.';}
 return null;
}
