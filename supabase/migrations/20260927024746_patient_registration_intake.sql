-- Patient is a verified self-selected account type, never an administrator grant.
CREATE TABLE private.registration_requests (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 requested_type text NOT NULL CHECK(requested_type IN ('guest','patient'))
);
ALTER TABLE private.registration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.registration_requests FROM PUBLIC, anon, authenticated;
CREATE FUNCTION private.capture_registration_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO private.registration_requests(user_id,requested_type) VALUES(NEW.id,CASE WHEN NEW.raw_user_meta_data->>'registration_type'='patient' THEN 'patient' ELSE 'guest' END);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.capture_registration_request() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_capture_registration_request AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.capture_registration_request();

CREATE OR REPLACE FUNCTION private.prevent_profile_role_escalation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.account_type IS DISTINCT FROM OLD.account_type AND NOT private.current_user_is_admin() THEN
  IF NOT (OLD.account_type='guest' AND NEW.account_type='patient' AND NEW.id=auth.uid()
    AND EXISTS(SELECT 1 FROM private.registration_requests r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=NEW.id AND r.requested_type='patient' AND u.email_confirmed_at IS NOT NULL)) THEN
   RAISE EXCEPTION 'Account type cannot be changed by the current user';
  END IF;
  DELETE FROM private.registration_requests WHERE user_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION private.complete_registration_impl() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE role_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email before continuing'; END IF;
 -- Lock profile so concurrent activation cannot re-apply a consumed request.
 SELECT account_type INTO role_name FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF role_name='guest' AND EXISTS(SELECT 1 FROM private.registration_requests WHERE user_id=auth.uid() AND requested_type='patient') THEN
  UPDATE public.profiles SET account_type='patient' WHERE id=auth.uid(); role_name:='patient';
 END IF;
 DELETE FROM private.registration_requests WHERE user_id=auth.uid();
 RETURN role_name;
END $$;
CREATE FUNCTION public.complete_registration() RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.complete_registration_impl() $$;
REVOKE ALL ON FUNCTION private.complete_registration_impl(), public.complete_registration() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.complete_registration_impl(), public.complete_registration() TO authenticated;

CREATE FUNCTION private.patient_secure_session() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND coalesce(auth.jwt()->>'aal','')='aal2'
 AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL)
 AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_type IN ('patient','admin'))
$$;
REVOKE ALL ON FUNCTION private.patient_secure_session() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.patient_secure_session() TO authenticated;
CREATE FUNCTION public.patient_security_ready() RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.patient_secure_session() $$;
REVOKE ALL ON FUNCTION public.patient_security_ready() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.patient_security_ready() TO authenticated;

CREATE TABLE public.patient_intakes (
 patient_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz
);
ALTER TABLE public.patient_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_read ON public.patient_intakes FOR SELECT TO authenticated USING(private.patient_secure_session() AND (patient_id=auth.uid() OR private.current_user_is_admin()));
CREATE POLICY intake_insert ON public.patient_intakes FOR INSERT TO authenticated WITH CHECK(private.patient_secure_session() AND patient_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_type='patient'));
CREATE POLICY intake_update ON public.patient_intakes FOR UPDATE TO authenticated USING(private.patient_secure_session() AND patient_id=auth.uid() AND status='draft') WITH CHECK(private.patient_secure_session() AND patient_id=auth.uid());
REVOKE ALL ON public.patient_intakes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.patient_intakes TO authenticated;
GRANT INSERT(patient_id,answers,status), UPDATE(answers,status) ON public.patient_intakes TO authenticated;

CREATE FUNCTION private.validate_patient_intake() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE k text; v jsonb;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.patient_id<>OLD.patient_id OR OLD.status='submitted') THEN RAISE EXCEPTION 'Submitted intake cannot be changed'; END IF;
 IF jsonb_typeof(NEW.answers)<>'object' OR octet_length(NEW.answers::text)>64000 THEN RAISE EXCEPTION 'Invalid intake answers'; END IF;
 FOR k,v IN SELECT * FROM jsonb_each(NEW.answers) LOOP
  IF k<>ALL(ARRAY['full_name','preferred_name','date_of_birth','pronouns','address','address2','city','state','postal_code','phone','email','contact_preference','safe_voicemail','insurance_coverage','insurance_carrier','insurance_member','insurance_group','insurance_phone','insurance_type','policyholder_name','policyholder_relationship','deductible','deductible_met','copay','coinsurance','insurance_notes','counseling_reason','concern_duration','counseling_goals']) OR jsonb_typeof(v)<>'string' OR length(v#>>'{}')>8000 THEN RAISE EXCEPTION 'Invalid intake field'; END IF;
 END LOOP;
 IF coalesce(NEW.answers->>'email','')<>'' AND NEW.answers->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid contact email'; END IF;
 FOREACH k IN ARRAY ARRAY['deductible','deductible_met','copay','coinsurance'] LOOP
  IF coalesce(NEW.answers->>k,'') NOT IN ('','I don’t know') THEN
   IF NEW.answers->>k !~ '^[0-9]+([.][0-9]{1,2})?$' THEN RAISE EXCEPTION 'Invalid cost amount'; END IF;
   IF k='coinsurance' AND (NEW.answers->>k)::numeric>100 THEN RAISE EXCEPTION 'Invalid coinsurance percentage'; END IF;
  END IF;
 END LOOP;
 IF NEW.status='submitted' THEN
  FOREACH k IN ARRAY ARRAY['full_name','date_of_birth','address','city','state','postal_code','phone','email','insurance_coverage','counseling_reason'] LOOP
   IF coalesce(btrim(NEW.answers->>k),'')='' THEN RAISE EXCEPTION 'Complete required intake fields before submitting'; END IF;
  END LOOP;
  IF NEW.answers->>'insurance_coverage' NOT IN ('insured','self-pay','unsure') THEN RAISE EXCEPTION 'Choose insurance coverage'; END IF;
  NEW.submitted_at:=now();
 ELSE NEW.submitted_at:=NULL;
 END IF;
 NEW.version:=CASE WHEN TG_OP='INSERT' THEN 1 ELSE OLD.version+1 END;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.validate_patient_intake() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_patient_intake BEFORE INSERT OR UPDATE ON public.patient_intakes FOR EACH ROW EXECUTE FUNCTION private.validate_patient_intake();

-- Existing patient scheduling is subject to the same second-factor gate.
CREATE POLICY appointments_patient_security ON public.appointments AS RESTRICTIVE FOR ALL TO authenticated
 USING(private.current_user_is_admin() OR private.patient_secure_session())
 WITH CHECK(private.current_user_is_admin() OR private.patient_secure_session());
