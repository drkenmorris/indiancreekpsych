"use client";
import Link from 'next/link';
import TierTwoTracker from './TierTwoTracker';
export default function DsmScreenNavigator({activeKey}:{activeKey:string}){
 return <><nav className="dsmNavigator" aria-label="Tiered screening navigation"><strong>{activeKey==='summary'?'Final screening report · last page':activeKey==='level1'?'Tier 1 · Screen all 19 domains':'Tier 2 · Selected domain follow-up'}</strong><span>Start with Tier 1, then open the domain links in its completed follow-up plan.</span><Link href="/clinical-tests/dev/level1">{activeKey==='level1'?'Tier 1 screening':'Return to Tier 1 and follow-up plan'}</Link></nav><TierTwoTracker activeKey={activeKey}/></>;
}
