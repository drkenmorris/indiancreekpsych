-- The intake trigger runs as the authenticated caller. Its pure input validators
-- must therefore be executable by that role. Keep them SECURITY INVOKER and
-- private; this grants no table access and does not bypass RLS or validation.
grant execute on function
 private.validate_intake_answers(jsonb,boolean),
 private.validate_intake_trauma_history(text),
 private.validate_intake_legal_form_fields(jsonb),
 private.validate_intake_legal_routing(text,boolean),
 private.validate_intake_medical_substance(text),
 private.validate_intake_medications(text,boolean),
 private.validate_intake_treatment_history(text,boolean)
to authenticated;
