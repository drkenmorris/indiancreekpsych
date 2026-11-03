"""Original structured assessment schema. No diagnostic or treatment inference."""
ASSESSMENT_FIELDS = {
    'biopsychosocial_history': 'Biopsychosocial history',
    'psychosocial_history': 'Psychosocial history',
    'presenting_problems': 'Presenting problems',
    'current_symptoms': 'Current symptoms',
    'emotional_history': 'Emotional history',
    'psychiatric_history': 'Psychiatric history',
    'family_history': 'Family history',
    'medical_history': 'Medical history',
    'substance_use_history': 'Substance-use history',
    'developmental_history': 'Developmental history',
    'socioeconomic_context': 'Socio-economic history and context',
    'sources_of_data': 'Sources of data',
    'clinical_summary': 'Clinician assessment summary'}
PLAN_FIELDS = ['diagnosis','problem_definition','goal','objective','intervention',
               'treatment_modality','treatment_approaches','response_to_treatment','homework','review_date']
