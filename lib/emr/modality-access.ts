import { createClient } from '@/lib/supabase/server';

export async function modalityAccess() {
 const supabase = await createClient();
 const { data: { user }, error } = await supabase.auth.getUser();
 if (error || !user?.email_confirmed_at) return null;

 const [profile, assurance] = await Promise.all([
  supabase.from('profiles').select('account_type').eq('id', user.id).maybeSingle(),
  supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
 ]);
 const role = profile.data?.account_type;
 if (profile.error || assurance.error || assurance.data?.currentLevel !== 'aal2' ||
   (role !== 'admin' && role !== 'staff')) return null;

 return { supabase, user, admin: role === 'admin' };
}
