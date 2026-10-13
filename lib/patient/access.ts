import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
export async function patientAccess(adminOnly=false, returnTo?:string){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect('/login?next='+encodeURIComponent(returnTo??(adminOnly?'/clinical-tests':'/patient/intake')));
 if(!user.email_confirmed_at)redirect('/account/security?next='+encodeURIComponent(returnTo??(adminOnly?'/clinical-tests':'/patient/intake')));
 const {data:role,error:registrationError}=await supabase.rpc('complete_registration');
 if(registrationError)throw new Error('Patient account setup is unavailable. Please try again later.');
 if(adminOnly?role!=='admin':!['patient','admin'].includes(role))redirect('/account');
 const {data:ready,error:securityError}=await supabase.rpc('patient_security_ready');
 if(securityError||!ready)redirect('/account/security?next='+encodeURIComponent(returnTo??(adminOnly?'/clinical-tests':'/patient/intake')));
 return {supabase,user,role};
}
