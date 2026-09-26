import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
 const supabase=await createClient();
 const {data:auth,error}=await supabase.auth.getUser();
 if(error||!auth.user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('account_type').eq('id',auth.user.id).single();
 if(profile?.account_type!=='admin')redirect('/appointments');
 const {data:settings,error:settingsError}=await supabase.from('appointment_settings').select('timezone,appointment_duration_minutes').eq('id',true).single();
 return <div className="icp-shell">
   <header className="icp-top-menu"><Link className="icp-brand" href="/"><span className="icp-brand-mark">IC</span><span className="icp-brand-copy"><strong>Indian Creek</strong><small>Psychological Services</small></span></Link></header>
   <main className="icp-shell-center calendarPage">{settingsError||!settings?<section className="appointmentPanel"><h1>Calendar unavailable</h1><p role="alert">Scheduling settings could not be loaded. Please reload this page.</p></section>:<CalendarClient timezone={settings.timezone} duration={settings.appointment_duration_minutes}/>}</main>
   <nav className="icp-bottom-menu" aria-label="Appointment navigation"><Link href="/">Home</Link><Link href="/account">Account</Link><Link href="/appointments">Booking & office hours</Link><Link href="/appointments/calendar" aria-current="page">Monthly calendar</Link></nav>
 </div>;
}
