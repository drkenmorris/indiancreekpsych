export const approachGroups = {
 'Cognitive and behavioral': [
  'Cognitive Behavioral Techniques', 'Cognitive Restructuring', 'Behavioral Activation',
  'Exposure-Based Interventions', 'Exposure and Response Prevention (ERP)',
  'Behavioral Experiments', 'Problem-Solving Therapy', 'CBT for Insomnia (CBT-I)',
 ],
 'Insight and interpersonal': [
  'Confrontive', 'Insight-Oriented Therapy', 'Psychodynamic Therapy',
  'Interpersonal Psychotherapy (IPT)', 'Emotion-Focused Therapy',
  'Attachment-Based Interventions', 'Narrative Therapy',
 ],
 'Brief, supportive, and educational': [
  'Solution-Oriented Brief Therapy', 'Supportive Maintenance', 'Symptom-Focused Education',
  'Motivational Interviewing', 'Strengths-Based Interventions',
  'Relapse Prevention', 'Grief Counseling',
 ],
 'Regulation and coping skills': [
  'Biofeedback/Relaxation Training', 'Mindfulness-Based Interventions',
  'Acceptance and Commitment Therapy (ACT)', 'Dialectical Behavior Therapy (DBT) Skills',
  'Grounding and Stabilization', 'Stress Management', 'Coping Skills Training',
 ],
 'Trauma-focused': [
  'Trauma-Focused Cognitive Behavioral Therapy (TF-CBT)', 'Cognitive Processing Therapy (CPT)',
  'Prolonged Exposure (PE)', 'Eye Movement Desensitization and Reprocessing (EMDR)',
 ],
 'Family, relationships, and development': [
  'Family Systems Therapy', 'Couples Therapy', 'Parent Management Training',
  'Caregiver Coaching', 'Communication and Social Skills Training', 'Play-Based Interventions',
 ],
};

export const maxApproaches = 100;
export const maxApproachLabel = 120;

export function validApproachLabel(value: unknown): value is string {
 return typeof value === 'string' && value.length > 0 && value.length <= maxApproachLabel &&
  value === value.trim() && !/[\x00-\x1f\x7f]/.test(value);
}
