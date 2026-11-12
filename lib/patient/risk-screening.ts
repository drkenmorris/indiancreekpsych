/** Shared intake-to-chart field contract. Values remain the patient's original report. */
export const riskChoiceFields=[
 ['suicidal_thoughts_current','Are you currently having thoughts of killing yourself or wishing you were dead?','select',true,['No','Yes']],
 ['suicidal_plan_current','Do you currently have a suicide plan, intent, or access to means you might use?','select',true,['No','Yes']],
 ['homicidal_thoughts_current','Are you currently having thoughts of seriously harming someone else?','select',true,['No','Yes']],
 ['abuse_neglect_current','Are you currently experiencing abuse, neglect, exploitation, stalking, or domestic violence?','select',true,['No','Yes']],
 ['weapons_access','Do you have access to firearms or other weapons?','select',false,['No','Yes']],
] as const;
export const riskNarrativeFields=[
 ['violence_risk_details','If yes to any safety question, please describe what is happening now','textarea'],
 ['protective_factors','People, responsibilities, beliefs, or supports that help keep you safe','textarea'],
] as const;
export const riskScreeningFields=[...riskChoiceFields,...riskNarrativeFields];
export const riskScreeningTitle='Safety and risk screening';
export const riskUrgentNotice='This form is not continuously monitored. If you are in immediate danger or believe you may act on thoughts of harming yourself or someone else, contact emergency services or seek immediate crisis assistance.';
export function reportedRiskFields(answers:Record<string,unknown>){return riskScreeningFields.map(([key,label,type])=>({key,label,type:type==='select'?'yes-no':'narrative',value:typeof answers[key]==='string'?answers[key] as string:''}));}
