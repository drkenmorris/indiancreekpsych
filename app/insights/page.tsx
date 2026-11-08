import Link from "next/link";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";
import { weeklyInsights } from "../content/weekly-insights";

export const metadata={title:"Weekly Wellbeing Insights | Indian Creek Psychological Services",description:"52 concise, practical mental-health insights covering relationships, anxiety, family, mood, stress, recovery, and more."};

export default function InsightsIndex(){return <div className="publicSite"><PublicHeader/><main className="insightLibrary"><header className="insightsHero"><p className="eyebrow">People · Clarity · Change · Hope</p><h1>A year of thoughtful wellbeing insights</h1><p>52 brief, clinically grounded reads to help make everyday life a little clearer. Explore at your own pace; these are educational reflections, not personal treatment recommendations.</p><p className="insightsCount">52 weekly editions · 9 subject areas</p></header><section className="insightsGrid" aria-label="Weekly editions">{weeklyInsights.map(item=><Link href={`/insights/${item.slug}`} className="insightTile" key={item.slug}><img src={item.image} alt="Indian Creek psychological care and wellbeing" loading="lazy"/><div><span>Week {String(item.week).padStart(2,"0")} · {item.category}</span><h2>{item.title}</h2><p>{item.summary}</p><strong>Read the insight →</strong></div></Link>)}</section></main><PublicFooter/></div>}
