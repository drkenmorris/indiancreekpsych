import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration = readFileSync(new URL('../supabase/migrations/20260926154213_adjacent_patient_scheduling.sql',import.meta.url),'utf8');
const admin='00000000-0000-0000-0000-000000000001';
const patient='00000000-0000-0000-0000-000000000002';
const other='00000000-0000-0000-0000-000000000003';
const guest='00000000-0000-0000-0000-000000000004';
const db = new PGlite();
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth; CREATE SCHEMA private;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.user',true),'')::uuid$$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,account_type text,full_name text,preferred_name text);
INSERT INTO public.profiles VALUES('${admin}','admin','Admin',null),('${patient}','patient','Patient One',null),('${other}','patient','Patient Two',null),('${guest}','guest','Guest',null);
CREATE FUNCTION private.current_user_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND account_type='admin')$$;
CREATE TABLE public.appointment_settings(id boolean PRIMARY KEY DEFAULT true,scheduling_enabled boolean,timezone text,appointment_duration_minutes int,slot_interval_minutes int,minimum_notice_hours int,maximum_advance_days int);
INSERT INTO public.appointment_settings VALUES(true,true,'America/Chicago',50,30,0,3650);
CREATE TABLE public.appointment_availability_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),weekday smallint CHECK(weekday BETWEEN 0 AND 6),start_time time,end_time time,enabled boolean DEFAULT true,CHECK(end_time>start_time));
INSERT INTO public.appointment_availability_rules(weekday,start_time,end_time) SELECT generate_series(0,6),'08:00','18:00';
CREATE TABLE public.appointment_blocks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),starts_at timestamptz,ends_at timestamptz);
CREATE TABLE public.appointments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),patient_id uuid REFERENCES public.profiles(id),starts_at timestamptz,ends_at timestamptz,status text DEFAULT 'booked',created_at timestamptz DEFAULT now(),cancelled_at timestamptz,CHECK(ends_at>starts_at));
CREATE FUNCTION private.validate_appointment_booking() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
CREATE TRIGGER validate_booking BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION private.validate_appointment_booking();
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appointments_patient_insert ON public.appointments FOR INSERT TO authenticated WITH CHECK(patient_id=auth.uid() AND EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND account_type IN ('patient','admin')));
CREATE POLICY appointments_select_own_or_admin ON public.appointments FOR SELECT TO authenticated USING(patient_id=auth.uid() OR private.current_user_is_admin());
CREATE POLICY appointments_update_own_or_admin ON public.appointments FOR UPDATE TO authenticated USING(patient_id=auth.uid() OR private.current_user_is_admin()) WITH CHECK(patient_id=auth.uid() OR private.current_user_is_admin());
GRANT USAGE ON SCHEMA public,private,auth TO authenticated;
GRANT SELECT ON public.profiles,public.appointment_settings,public.appointment_availability_rules,public.appointment_blocks TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.appointments TO authenticated;
`);
await db.exec(migration);
const query=(sql,params=[])=>db.query(sql,params);
const day=(await query("select (current_date+14)::text as d")).rows[0].d;
async function asUser(id){await query("select set_config('request.user',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
async function reset(){await db.exec('RESET ROLE;TRUNCATE public.appointments,public.appointment_blocks;UPDATE public.appointment_settings SET scheduling_enabled=true,minimum_notice_hours=0,appointment_duration_minutes=50,maximum_advance_days=3650;UPDATE public.appointment_availability_rules SET anchor_time=null;');await asUser(admin);}
const book=(id,time,date=day,repeat=0,through=date)=>query('select public.book_patient_appointments($1,$2,$3,$4,$5) as count',[id,date,time,repeat,through]);
async function slots(date=day){return (await query("select (starts_at at time zone 'America/Chicago')::time::text as t from private.get_available_appointment_slots_impl($1,$1)",[date])).rows.map(r=>r.t);}
await test('Saturday 0-6 indexing and same-day office hours are accepted',async()=>{await db.exec("INSERT INTO public.appointment_availability_rules(weekday,start_time,end_time) VALUES(6,'09:00','17:00')");await assert.rejects(db.exec("INSERT INTO public.appointment_availability_rules(weekday,start_time,end_time) VALUES(6,'17:00','09:00')"));});
await test('empty day closed; anchor opens 9 and 11; booking 11 opens 12',async()=>{await reset();assert.deepEqual(await slots(),[]);await book(patient,'10:00');assert.deepEqual(await slots(),['09:00:00','11:00:00']);await asUser(other);await query("insert into appointments(patient_id,starts_at,ends_at) values($1,($2::date+time '11:00') at time zone 'America/Chicago',($2::date+time '11:50') at time zone 'America/Chicago')",[other,day]);assert.deepEqual(await slots(),['09:00:00','12:00:00']);});
await test('hidden slot cannot be booked by direct request; guest denied',async()=>{await reset();await book(patient,'10:00');await asUser(other);await assert.rejects(query("insert into appointments(patient_id,starts_at,ends_at) values($1,($2::date+time '14:00') at time zone 'America/Chicago',($2::date+time '14:50') at time zone 'America/Chicago')",[other,day]),/adjacent/);await asUser(guest);assert.deepEqual(await slots(),[]);await assert.rejects(book(patient,'11:00'),/Administrator/);await assert.rejects(query('select * from public.scheduling_patients()'),/Administrator/);});
await test('hours, blocked time, minimum notice, cancellation and existing bookings constrain openings',async()=>{await reset();await book(patient,'08:00');assert.deepEqual(await slots(),['09:00:00']);await db.exec('RESET ROLE');await query("insert into appointment_blocks(starts_at,ends_at) values(($1::date+time '09:00') at time zone 'America/Chicago',($1::date+time '10:00') at time zone 'America/Chicago')",[day]);await asUser(patient);assert.deepEqual(await slots(),[]);await query("update appointments set status='cancelled' where patient_id=$1",[patient]);assert.deepEqual(await slots(),[]);});
await test('series is atomic on conflict and only patient accounts can be selected',async()=>{await reset();await assert.rejects(book(guest,'10:00'),/Patient account/);await book(patient,'10:00');const earlier=(await query('select ($1::date-7)::text as d',[day])).rows[0].d;await assert.rejects(book(other,'10:00',earlier,1,day),/no longer available/);assert.equal((await query('select count(*)::int as c from appointments')).rows[0].c,1);});
await test('weekly and fortnightly series preserve local time across DST',async()=>{await reset();assert.equal((await book(patient,'10:00','2030-10-26',1,'2030-11-09')).rows[0].count,3);const rows=(await query("select (starts_at at time zone 'America/Chicago')::time::text as local,extract(hour from starts_at at time zone 'UTC')::int as utc from appointments order by starts_at")).rows;assert(rows.every(r=>r.local==='10:00:00'));assert.deepEqual(rows.map(r=>r.utc),[15,15,16]);await reset();assert.equal((await book(patient,'10:00','2030-10-26',2,'2030-11-23')).rows[0].count,3);});
await test('admin may seed bookings while online booking is paused; patient openings stay closed',async()=>{await reset();await db.exec('RESET ROLE;UPDATE appointment_settings SET scheduling_enabled=false');await asUser(admin);await book(patient,'10:00');await asUser(patient);assert.deepEqual(await slots(),[]);});
await test('patients see only their own appointments; cannot reschedule/reactivate or alter a series',async()=>{await reset();await book(patient,'10:00');await asUser(other);assert.equal((await query('select * from appointments')).rows.length,0);await asUser(patient);await assert.rejects(query("update appointments set starts_at=starts_at+interval '1 hour'"),/replacement/);await query("update appointments set status='cancelled'");await assert.rejects(query("update appointments set status='booked'"),/cancel/);});
await test('reserved daily hour opens only adjacent starts and supports outward growth',async()=>{
 await reset();await db.exec('RESET ROLE');await query("update appointment_availability_rules set anchor_time='10:00' where weekday=extract(dow from $1::date)::int",[day]);await asUser(patient);
 assert.deepEqual(await slots(),['09:00:00','11:00:00']);
 await query("insert into appointments(patient_id,starts_at,ends_at) values($1,($2::date+time '11:00') at time zone 'America/Chicago',($2::date+time '11:50') at time zone 'America/Chicago')",[patient,day]);
 assert.deepEqual(await slots(),['09:00:00','12:00:00']);
 await assert.rejects(query("insert into appointments(patient_id,starts_at,ends_at) values($1,($2::date+time '10:00') at time zone 'America/Chicago',($2::date+time '10:50') at time zone 'America/Chicago')",[patient,day]),/adjacent/);
 await asUser(admin);await book(other,'10:00');assert.deepEqual(await slots(),['09:00:00','12:00:00']);
 await db.exec('RESET ROLE');await assert.rejects(db.exec("update appointment_availability_rules set anchor_time='17:30'"),/availability_anchor_within_hours/);
});
await test('admin can book an established patient without a portal account; patients cannot see that name',async()=>{
 await reset();await query("select public.book_patient_appointments(null,$1,'13:00',0,$1,'Synthetic Existing Patient')",[day]);
 const rows=(await query('select patient_id,patient_name from appointments')).rows;assert.equal(rows[0].patient_id,null);assert.equal(rows[0].patient_name,'Synthetic Existing Patient');
 await asUser(patient);assert.equal((await query('select * from appointments')).rows.length,0);
 await assert.rejects(query("insert into appointments(patient_id,patient_name,starts_at,ends_at) values(null,'Synthetic Patient',($1::date+time '14:00') at time zone 'America/Chicago',($1::date+time '14:50') at time zone 'America/Chicago')",[day]),/administrator/);
});
await test('changing the reserved hour moves openings; existing appointments remain independent anchors',async()=>{
 await reset();await db.exec('RESET ROLE');await query("update appointment_availability_rules set anchor_time='10:00' where weekday=extract(dow from $1::date)::int",[day]);await asUser(admin);assert.deepEqual(await slots(),['09:00:00','11:00:00']);
 await db.exec('RESET ROLE');await query("update appointment_availability_rules set anchor_time='14:00' where weekday=extract(dow from $1::date)::int",[day]);await asUser(admin);assert.deepEqual(await slots(),['13:00:00','15:00:00']);
 await book(patient,'10:00');assert.deepEqual(await slots(),['09:00:00','11:00:00','13:00:00','15:00:00']);
});
await test('notice and advance limits still apply to adjacent openings',async()=>{
 await reset();await book(patient,'10:00');await db.exec('RESET ROLE;UPDATE appointment_settings SET minimum_notice_hours=720');await asUser(patient);assert.deepEqual(await slots(),[]);
 await db.exec('RESET ROLE;UPDATE appointment_settings SET minimum_notice_hours=0,maximum_advance_days=1');await asUser(patient);assert.deepEqual(await slots(),[]);
});
await db.close();
