create function private.valid_modality_care_periods(periods jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare
 period jsonb;
 start_date text;
 end_date text;
begin
 if jsonb_typeof(periods) is distinct from 'array' then
  return false;
 end if;
 if jsonb_array_length(periods)>50 then
  return false;
 end if;

 for period in select value from jsonb_array_elements(periods) loop
  if jsonb_typeof(period) is distinct from 'object' then
   return false;
  end if;
  if (select count(*) from jsonb_object_keys(period))<>4
   or coalesce(period->>'level','') not in ('outpatient','intensive_outpatient','day_treatment','partial_hospitalization','inpatient')
   or not (period ? 'agreement') or jsonb_typeof(period->'agreement') not in ('boolean','null')
   or jsonb_typeof(period->'startDate') is distinct from 'string'
   or jsonb_typeof(period->'endDate') is distinct from 'string' then
   return false;
  end if;

  start_date:=period->>'startDate';
  end_date:=period->>'endDate';
  if start_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   or (end_date<>'' and end_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
   return false;
  end if;
  perform start_date::date;
  if end_date<>'' and end_date::date<start_date::date then
   return false;
  end if;
 end loop;
 return true;
exception when invalid_datetime_format or datetime_field_overflow then
 return false;
end;
$$;

revoke all on function private.valid_modality_care_periods(jsonb) from public,anon,authenticated;
grant execute on function private.valid_modality_care_periods(jsonb) to authenticated;

alter table public.emr_treatment_modalities
 add column care_periods jsonb not null default '[]',
 add constraint emr_modality_valid_care_periods check (private.valid_modality_care_periods(care_periods));

grant update(care_periods) on public.emr_treatment_modalities to authenticated;
