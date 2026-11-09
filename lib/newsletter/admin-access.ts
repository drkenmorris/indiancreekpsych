import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Return a user-bound RLS client only after confirmed administrator MFA. */
export async function newsletterAdminAccess(){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||!user.email_confirmed_at)return null;
  const [{data:profile,error:roleError},{data:assurance,error:mfaError}]=await Promise.all([
    supabase.from("profiles").select("account_type").eq("id",user.id).maybeSingle(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if(roleError||profile?.account_type!=="admin"||mfaError||assurance?.currentLevel!=="aal2")return null;
  return {supabase,user};
}
