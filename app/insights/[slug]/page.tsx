import Link from "next/link";
import { notFound } from "next/navigation";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";
import { getWeeklyInsight, weeklyInsights } from "../../content/weekly-insights";

export function generateStaticParams(){return weeklyInsights.map(item=>({slug:item.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=getWeeklyInsight(slug);return {title:item?`${item.title} | Indian Creek Psychological Services`:"Weekly Insight",description:item?.summary};}

export default async function InsightPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=getWeeklyInsight(slug);if(!item)notFound();const next=weeklyInsights[item.week%52];return <div className="publicSite"><PublicHeader/><main className="insightArticle"><div className="insightArticleImage"><img src={item.image} alt="Color photograph illustrating psychological wellbeing"/></div><article><p className="eyebrow">Indian Creek Psychological Services · Week {String(item.week).padStart(2,"0")}</p><h1>{item.title}</h1><p className="insightLead">{item.summary}</p><h2>A little insight</h2><p>{item.insight}</p><div className="insightPractice"><h2>One small thing to try</h2><p>{item.practice}</p></div><p className="insightDisclaimer">For general education only. This material is not a diagnosis or substitute for individualized medical or psychological care. If you are in immediate danger, call emergency services; in the U.S., call or text 988 for suicide or mental-health crisis support.</p><div className="insightArticleNav"><Link href="/insights">← All 52 insights</Link><Link href={`/insights/${next.slug}`}>Next insight →</Link></div></article></main><PublicFooter/></div>}
