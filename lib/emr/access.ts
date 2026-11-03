import {createClient} from '@/lib/supabase/server';
export async function emrAccess(){const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user?.email_confirmed_at)return null;const [{data:profile,error:pError},{data:aal,error:aError}]=await Promise.all([supabase.from('profiles').select('account_type').eq('id',user.id).maybeSingle(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);if(pError||profile?.account_type!=='admin'||aError||aal?.currentLevel!=='aal2')return null;return {supabase,user};}
export function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
