import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { weeklyInsights } from "@/app/content/weekly-insights";
import NewsletterPlanner from "./NewsletterPlanner";
import "./newsletter-admin.css";

export const dynamic="force-dynamic";
export const metadata={title:"Newsletter Editorial Calendar | Indian Creek"};

export default async function NewsletterAdminPage(){
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)redirect("/login?next=%2Fadmin%2Fnewsletters");
 if(!user.email_confirmed_at)redirect("/account/security?next=%2Fadmin%2Fnewsletters");
 const [{data:profile},{data:assurance,error:mfaError}]=await Promise.all([
   supabase.from("profiles").select("account_type").eq("id",user.id).maybeSingle(),
   supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
 ]);
 if(profile?.account_type!=="admin")redirect("/account");
 if(mfaError||assurance?.currentLevel!=="aal2")redirect("/account/security?next=%2Fadmin%2Fnewsletters");
 const {data:schedules,error:scheduleError}=await supabase.from("newsletter_article_schedule")
   .select("article_slug,status,scheduled_at,updated_at");
 return <main className="newsletterAdmin"><div className="newsletterAdminHead"><Link href="/account">← Administrator account</Link><p className="eyebrow">Indian Creek · Editorial management</p><h1>Newsletter Library & Calendar</h1><p>Review, preview and organize all 52 educational articles. Set an editorial deployment date for each edition, or clear a proposed date.</p></div>
 <div className="newsletterAdminNotice"><strong>Scheduling is a planning step—not an email send.</strong> No background dispatch is enabled. Existing mailing-list consent is for delivery every two weeks. Paubox dispatch, confirmed opt-in eligibility, unsubscribe handling, and delivery reporting must be connected and verified before live distribution.</div>
 {scheduleError?<p role="alert" className="newsletterError">The saved calendar could not be loaded. Please contact the site administrator before scheduling.</p>:<NewsletterPlanner articles={weeklyInsights} initialSchedules={(schedules??[]) as {article_slug:string;status:string;scheduled_at:string|null;updated_at:string}[]}/>}
 </main>;
}
