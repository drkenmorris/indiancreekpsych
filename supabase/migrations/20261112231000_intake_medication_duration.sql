-- Intake page 6 medication entries, retaining existing answer keys and access controls.
create or replace function private.validate_intake_medications(p_value text,p_submitting boolean)
returns void language plpgsql set search_path='' as $meds$
declare entries jsonb; entry jsonb; k text; v jsonb; d date;
begin
 if coalesce(p_value,'')='' then return; end if;
 if length(p_value)>40000 then raise exception 'Medication list is too long'; end if;
 begin entries:=p_value::jsonb; exception when others then raise exception 'Invalid medication list'; end;
 if jsonb_typeof(entries)<>'array' then raise exception 'Medication list must be an array'; end if;
 if jsonb_array_length(entries)>20 then raise exception 'Use up to 20 medication entries'; end if;
 for entry in select value from jsonb_array_elements(entries) loop
  if jsonb_typeof(entry)<>'object' then raise exception 'Invalid medication entry'; end if;
  if (select count(*) from jsonb_object_keys(entry))<>(8 + case when entry ? 'duration' then 1 else 0 end) or not entry ?& array['medication','status','dosage','frequency','start_date','end_date','prescribing_physician','benefit'] then raise exception 'Invalid medication fields'; end if;
  if entry ? 'duration' and (jsonb_typeof(entry->'duration')<>'string' or entry->>'duration' not in ('','Less than 3 months','3 to less than 6 months','6 months to less than 1 year','1 to less than 2 years','2 to 5 years','More than 5 years','Not sure')) then raise exception 'Invalid medication duration'; end if;
  for k,v in select * from jsonb_each(entry) loop
   if jsonb_typeof(v)<>'string' or length(v#>>'{}')>(case k when 'status' then 7 when 'benefit' then 14 when 'start_date' then 10 when 'end_date' then 10 else 200 end) then raise exception 'Invalid medication field'; end if;
  end loop;
  if entry->>'status' not in ('','Current','Past') or entry->>'benefit' not in ('','Beneficial','Not beneficial') then raise exception 'Invalid medication status or benefit'; end if;
  foreach k in array array['start_date','end_date'] loop
   if entry->>k<>'' then
    if entry->>k !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid medication date'; end if;
    begin d:=(entry->>k)::date; exception when others then raise exception 'Invalid medication date'; end;
    if d>current_date then raise exception 'Medication date cannot be in the future'; end if;
   end if;
  end loop;
  if entry->>'status'='Current' and entry->>'end_date'<>'' then raise exception 'Current medication cannot have an end date'; end if;
  if entry->>'start_date'<>'' and entry->>'end_date'<>'' and entry->>'end_date'<entry->>'start_date' then raise exception 'Medication end date precedes start date'; end if;
  if p_submitting and exists(select 1 from jsonb_each_text(entry) t where btrim(t.value)<>'') then
   if btrim(entry->>'medication')='' or entry->>'status'='' then raise exception 'Enter medication name and Current or Past status'; end if;
  end if;
 end loop;
end
$meds$;
