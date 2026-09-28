export type IntakeField = readonly [key:string,label:string,type:string,required?:boolean,options?:readonly string[]];

const yesNo=['No','Yes'] as const;
const yesNoUnsure=['No','Yes','Unsure'] as const;

export const intakeSections:{title:string;description?:string;fields:readonly IntakeField[]}[]=[
 {title:'Demographics and contact information',description:'Basic identifying and contact information used for your care and billing.',fields:[
  ['full_name','Full legal name','text',true],['preferred_name','Preferred name','text'],['date_of_birth','Date of birth','date',true],
  ['sex_at_birth','Sex assigned at birth','select',false,['Female','Male','Intersex','Prefer not to answer']],['gender_identity','Gender identity','text'],['pronouns','Pronouns','text'],
  ['marital_status','Marital / relationship status','text'],['primary_language','Primary language','text'],['interpreter_needed','Do you need an interpreter?','select',false,yesNoUnsure],
  ['address','Street address','text',true],['address2','Apartment / unit','text'],['city','City','text',true],['state','State','text',true],['postal_code','ZIP code','text',true],
  ['phone','Phone number','tel',true],['email','Contact email','email',true],['contact_preference','Preferred contact method','select',false,['Email','Phone','Text message','Patient portal','Any of these']],
  ['safe_voicemail','May we leave a voicemail that identifies Indian Creek Psychological Services?','select',false,yesNo],
  ['preferred_pharmacy','Preferred pharmacy and location','text']
 ]},
 {title:'Emergency contact, guardian, and responsible party',description:'Information used for emergency contact and, when applicable, legal or financial responsibility.',fields:[
  ['emergency_contact_name','Emergency contact name','text',true],['emergency_contact_relationship','Relationship to you','text',true],['emergency_contact_phone','Emergency contact phone','tel',true],
  ['emergency_contact_permission','May we contact this person in an emergency?','select',true,yesNo],
  ['guardian_name','Parent / guardian / legal representative name, if applicable','text'],['guardian_relationship','Guardian relationship','text'],['guardian_phone','Guardian phone','tel'],
  ['custody_notes','Custody, guardianship, power-of-attorney, or other legal decision-making information','textarea']
 ]},
 {title:'Insurance and benefits information',description:'Information from your insurance card or benefits statement. Coverage and patient-responsibility amounts are estimates until verified by the payer.',fields:[
  ['insurance_coverage','How will you pay for care?','select',true,['insured','self-pay','unsure']],['insurance_carrier','Primary insurance carrier','text'],
  ['insurance_type','Primary plan type','select',false,['PPO','POS','HMO','EPO','HDHP','Medicare','Medicaid','Medicare Advantage','TRICARE','Other','I don’t know']],
  ['insurance_member','Member / subscriber ID','text'],['insurance_group','Group number','text'],['insurance_phone','Behavioral-health / provider-services phone number','tel'],
  ['policyholder_name','Policyholder / subscriber name','text'],['policyholder_relationship','Relationship to policyholder','text'],['policyholder_dob','Policyholder date of birth','date'],['policyholder_employer','Policyholder employer, if applicable','text'],
  ['medicare_beneficiary_id','Medicare Beneficiary Identifier (MBI), if applicable','text'],['medicaid_id','Medicaid member ID, if applicable','text'],['medicaid_state','Medicaid state / program, if applicable','text'],
  ['insurance_effective_date','Coverage effective date, if known','date'],['referral_required','Does your plan require a referral?','select',false,yesNoUnsure],['referral_provider','Referring provider / referral source','text'],
  ['authorization_required','Does your plan require prior authorization?','select',false,yesNoUnsure],['authorization_number','Authorization number, if known','text'],['authorized_visits','Number of visits authorized, if known','text'],
  ['secondary_insurance','Do you have secondary insurance?','select',false,yesNoUnsure],['secondary_carrier','Secondary insurance carrier','text'],['secondary_member','Secondary member ID','text'],['secondary_group','Secondary group number','text'],
  ['deductible','Annual deductible','text'],['deductible_met','Deductible met so far this plan year','text'],['copay','Copay per visit','text'],['coinsurance','Coinsurance percentage you pay','text'],
  ['insurance_notes','Other insurance, coordination-of-benefits, or billing information','textarea']
 ]},
 {title:'Presenting concerns and functional impact',description:'Describe the concerns that brought you to care and how they affect daily functioning.',fields:[
  ['counseling_reason','What brings you to counseling now?','textarea',true],['concern_onset','Approximate onset / date problems began','text'],['concern_duration','How long have these concerns been present?','text'],
  ['precipitating_events','Recent events or changes that contributed to seeking care','textarea'],['symptom_frequency','How often are the main symptoms occurring?','text'],
  ['symptom_severity','How severe do the symptoms feel?','select',false,['Mild','Moderate','Severe','Varies / unsure']],
  ['functional_impact','Describe how these concerns affect your functioning','textarea',true],['sleep','Sleep concerns','textarea'],['appetite','Appetite / weight changes','textarea'],
  ['energy','Energy / motivation','textarea'],['concentration','Attention / concentration','textarea'],['work_school_impact','Impact on work or school','textarea'],
  ['relationship_impact','Impact on relationships','textarea'],['daily_living_impact','Impact on self-care, household tasks, or other daily activities','textarea'],
  ['counseling_goals','What would you like to achieve through counseling?','textarea',true]
 ]},
 {title:'Mental health treatment history',description:'Prior treatment and responses help your clinician understand what has and has not been useful.',fields:[
  ['prior_mental_health_treatment','Have you received counseling, psychotherapy, psychiatric care, or psychological services before?','select',true,yesNoUnsure],
  ['prior_therapists','Prior therapists, psychiatrists, clinics, approximate dates, and what was helpful','textarea'],['prior_diagnoses','Prior mental health or behavioral diagnoses','textarea'],
  ['psychiatric_hospitalizations','Psychiatric hospitalizations, crisis stabilization, or emergency evaluations','textarea'],['self_harm_history','Past self-harm or non-suicidal self-injury','textarea'],
  ['suicide_attempt_history','Past suicide attempts or suicide-related emergency care','textarea'],['prior_psychiatric_medications','Past psychiatric medications and response / side effects','textarea'],
  ['family_mental_health_history','Family history of mental health conditions, suicide, or substance-use problems','textarea']
 ]},
 {title:'Medical history and medications',description:'Medical conditions and medications can affect mood, cognition, sleep, and treatment planning.',fields:[
  ['primary_care_provider','Primary care provider','text'],['pcp_phone','Primary care provider phone','tel'],['medical_conditions','Current or significant medical conditions','textarea',true],
  ['surgeries_hospitalizations','Significant surgeries or medical hospitalizations','textarea'],['allergies','Medication, food, or environmental allergies','textarea'],
  ['medications_current','Current medications, dose if known, and prescribing clinician','textarea',true],['pregnancy_status','Pregnancy / postpartum status, if applicable','select',false,['Not applicable','No','Pregnant','Postpartum','Unsure','Prefer not to answer']],
  ['head_injury_seizure_history','History of head injury, concussion, seizures, or neurological conditions','textarea']
 ]},
 {title:'Alcohol, substances, and behavioral health risks',description:'Please answer candidly. These questions help the clinician assess safety and treatment needs.',fields:[
  ['alcohol_use','Current alcohol use: type, amount, and frequency','textarea'],['drug_use','Current non-prescribed drug or cannabis use: substances, amount, and frequency','textarea'],
  ['tobacco_nicotine','Tobacco / nicotine use','textarea'],['substance_treatment_history','Prior substance-use treatment, detoxification, or recovery supports','textarea'],
  ['substance_consequences','Legal, medical, work, school, or relationship consequences related to substances','textarea'],['gambling_other_behaviors','Gambling or other compulsive behaviors that concern you','textarea']
 ]},
 {title:'Safety and risk screening',description:'These questions help us identify urgent safety needs. This electronic form is not continuously monitored.',fields:[
  ['suicidal_thoughts_current','Are you currently having thoughts of killing yourself or wishing you were dead?','select',true,yesNo],
  ['suicidal_plan_current','Do you currently have a suicide plan, intent, or access to means you might use?','select',true,yesNo],
  ['homicidal_thoughts_current','Are you currently having thoughts of seriously harming someone else?','select',true,yesNo],
  ['violence_risk_details','If yes to any safety question, please describe what is happening now','textarea'],
  ['abuse_neglect_current','Are you currently experiencing abuse, neglect, exploitation, stalking, or domestic violence?','select',true,yesNoUnsure],
  ['weapons_access','Do you have access to firearms or other weapons?','select',false,yesNoUnsure],['protective_factors','People, responsibilities, beliefs, or supports that help keep you safe','textarea']
 ]},
 {title:'Trauma, family, social, educational, and occupational history',description:'Social context and life experiences can affect symptoms, coping, and treatment goals.',fields:[
  ['trauma_history','Significant trauma, abuse, loss, violence, or other adverse experiences you want your clinician to know about','textarea'],
  ['family_household','Current household, family, and important relationships','textarea'],['social_supports','Friends, family, community, faith, or other supports','textarea'],
  ['education_history','Education, learning difficulties, or school concerns','textarea'],['employment_history','Employment / occupation and current work concerns','textarea'],
  ['military_history','Military service / veteran status, if applicable','textarea'],['legal_history','Current or past legal involvement that may affect treatment','textarea'],
  ['cultural_spiritual_factors','Cultural, spiritual, religious, identity, or community factors important to your care','textarea'],['strengths_interests','Personal strengths, interests, and coping resources','textarea']
 ]},
 {title:'Communication and confidential-contact preferences',description:'Tell us how we may communicate with you. You may request reasonable alternative means or locations for confidential communications.',fields:[
  ['comm_phone_calls','May we call your primary phone?','select',true,yesNo],['comm_voicemail','May we leave voicemail?','select',true,yesNo],
  ['comm_voicemail_detail','If voicemail is allowed, what may we say?','select',false,['Practice name and callback number only','Appointment date/time only','Billing information','General clinical coordination','Do not leave details']],
  ['comm_text','May we send text messages?','select',true,yesNo],['comm_email','May we send email?','select',true,yesNo],['comm_portal','May we send patient-portal messages?','select',true,yesNo],
  ['comm_mail','May we send postal mail to your listed address?','select',true,yesNo],['comm_other_number','Alternative safe phone number, if any','tel'],['comm_other_address','Alternative safe mailing address, if any','textarea'],
  ['comm_restrictions','Other communication restrictions or privacy requests','textarea']
 ]},
 {title:'Notice of Privacy Practices acknowledgment',description:'This acknowledges receipt or availability of the practice Notice of Privacy Practices. It is not a blanket authorization to disclose your information.',fields:[
  ['npp_received','I acknowledge that I received or was offered access to the Notice of Privacy Practices.','select',true,['Yes']],
  ['npp_questions','Questions or concerns about the privacy notice','textarea'],['npp_signature','Electronic signature — type your full legal name','text',true],['npp_signature_date','Date signed','date',true]
 ]},
 {title:'Authorization to share health information',description:'Optional. Complete this section only if you want Indian Creek Psychological Services to disclose information to a family member, loved one, attorney, school, employer, physician, or other professional. Psychotherapy notes are not included in this authorization.',fields:[
  ['roi_authorize','Do you want to authorize a disclosure to another person or organization?','select',true,['No','Yes']],
  ['roi_recipient_name','Person / organization authorized to receive information','text'],['roi_recipient_relationship','Relationship / organization type','text'],['roi_recipient_phone','Recipient phone','tel'],['roi_recipient_email','Recipient email / secure destination','email'],
  ['roi_information_scope','Information that may be disclosed','textarea'],['roi_information_exclusions','Information that must NOT be disclosed','textarea'],
  ['roi_purpose','Purpose of disclosure','text'],['roi_expiration','Authorization expiration date or event','text'],
  ['roi_direction','Direction of exchange','select',false,['Indian Creek may disclose to recipient','Recipient may disclose to Indian Creek','Two-way exchange']],
  ['roi_revocation_ack','I understand I may revoke this authorization in writing, except to the extent action has already been taken in reliance on it.','select',false,['Yes']],
  ['roi_voluntary_ack','I understand treatment/payment generally may not be conditioned on signing this optional authorization, and information disclosed to some recipients may be subject to redisclosure.','select',false,['Yes']],
  ['roi_signature','Electronic signature — type your full legal name','text'],['roi_signature_date','Date signed','date']
 ]},
 {title:'Separate authorization for psychotherapy notes',description:'Optional and separate from the general release above. Psychotherapy notes receive special protection and are not included in the general release-of-information section.',fields:[
  ['psych_notes_authorize','Do you authorize disclosure of psychotherapy notes?','select',true,['No','Yes']],
  ['psych_notes_recipient','If yes, person / organization authorized to receive psychotherapy notes','text'],['psych_notes_purpose','Purpose of disclosure','text'],['psych_notes_expiration','Expiration date or event','text'],
  ['psych_notes_revocation_ack','I understand I may revoke this authorization in writing, subject to actions already taken in reliance on it.','select',false,['Yes']],
  ['psych_notes_signature','Electronic signature — type your full legal name','text'],['psych_notes_signature_date','Date signed','date']
 ]},
 {title:'Patient attestation and consent to submit',description:'Review your answers before submitting. Clinical diagnosis, mental-status examination, medical-necessity determination, and treatment planning are completed separately by the clinician.',fields:[
  ['information_accuracy','I certify that the information I provided is accurate and complete to the best of my knowledge.','select',true,['Yes']],
  ['electronic_signature_consent','I agree that typing my name below constitutes my electronic signature for this intake questionnaire and acknowledgments.','select',true,['Yes']],
  ['patient_signature','Electronic signature — type your full legal name','text',true],['patient_signature_date','Date signed','date',true]
 ]}
];

export type IntakeAnswers=Record<string,string>;
export type IntakeRecord={patient_id:string;answers:IntakeAnswers;status:'draft'|'submitted';version:number;updated_at:string;submitted_at:string|null};
export const costFields=['deductible','deductible_met','copay','coinsurance'];
export const intakeKeys=intakeSections.flatMap(section=>section.fields.map(field=>field[0]));
export const requiredIntakeKeys=intakeSections.flatMap(section=>section.fields.filter(field=>field[3]).map(field=>field[0]));

export function validateIntake(answers:IntakeAnswers,submit:boolean){
 for(const section of intakeSections)for(const f of section.fields){
  const value=answers[f[0]]??'';
  if(value.length>8000)return `${f[1]} is too long.`;
  if(submit&&f[3]&&!value.trim())return `Please complete: ${f[1]}.`;
 }
 if(answers.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email))return 'Enter a valid contact email.';
 if(answers.roi_recipient_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.roi_recipient_email))return 'Enter a valid release recipient email.';
 if(answers.date_of_birth&&answers.date_of_birth>new Date().toISOString().slice(0,10))return 'Date of birth cannot be in the future.';
 for(const k of costFields){const v=answers[k];if(v&&v!=='I don’t know'&&(!/^\d+(\.\d{1,2})?$/.test(v)||Number(v)<0||(k==='coinsurance'&&Number(v)>100)))return k==='coinsurance'?'Coinsurance must be between 0 and 100, or choose I don’t know.':'Enter a non-negative amount, or choose I don’t know.';}
 if(submit&&answers.roi_authorize==='Yes'){
  for(const [k,label] of [['roi_recipient_name','release recipient'],['roi_information_scope','information to be disclosed'],['roi_purpose','purpose of disclosure'],['roi_expiration','authorization expiration'],['roi_revocation_ack','revocation acknowledgment'],['roi_voluntary_ack','authorization acknowledgment'],['roi_signature','release signature'],['roi_signature_date','release signature date']] as const)if(!answers[k]?.trim())return `Please complete the ${label} for the release authorization.`;
 }
 if(submit&&answers.psych_notes_authorize==='Yes'){
  for(const [k,label] of [['psych_notes_recipient','psychotherapy-notes recipient'],['psych_notes_purpose','psychotherapy-notes purpose'],['psych_notes_expiration','psychotherapy-notes expiration'],['psych_notes_revocation_ack','psychotherapy-notes revocation acknowledgment'],['psych_notes_signature','psychotherapy-notes signature'],['psych_notes_signature_date','psychotherapy-notes signature date']] as const)if(!answers[k]?.trim())return `Please complete the ${label}.`;
 }
 if(submit&&(answers.suicidal_plan_current==='Yes'||answers.homicidal_thoughts_current==='Yes')&&!answers.violence_risk_details?.trim())return 'Please describe the current safety concern so the clinician can review it.';
 return null;
}
