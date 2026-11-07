import {createClient} from '@/lib/supabase/server';
export const asqPrivateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
export const asqRecipientReleaseApproved=()=>process.env.ASQ_RECIPIENT_RELEASE_APPROVED==='true';
export async function asqRecipientAccess(){const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user?.email_confirmed_at)return null;const {data,error:aalError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError)return null;if(data.currentLevel!=='aal2'){const {data:ready,error:securityError}=await supabase.rpc('patient_security_ready');if(securityError||!ready)return null;}return {supabase,user};}
