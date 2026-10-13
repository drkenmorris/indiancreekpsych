"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clinicalDevScreenList } from "@/lib/clinical-tests/catalog";

export default function DsmScreenNavigator({ activeKey }: { activeKey: string }) {
  const router = useRouter();
  const index = clinicalDevScreenList.findIndex(([key]) => key === activeKey);
  const previous = index > 0 ? clinicalDevScreenList[index - 1] : null;
  const following = index >= 0 && index + 1 < clinicalDevScreenList.length ? clinicalDevScreenList[index + 1] : null;
  return (
    <nav className="dsmNavigator" aria-label="DSM screening module selection">
      <label htmlFor="dsm-select"><strong>Screening module</strong><small>Choose any Level 1 or Level 2 domain</small></label>
      <select id="dsm-select" value={activeKey} onChange={e => router.push(`/clinical-tests/dev/${e.target.value}`)}>
        {clinicalDevScreenList.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <div className="dsmNavigatorSteps">
        {previous ? <Link href={`/clinical-tests/dev/${previous[0]}`}>← Previous</Link> : <span>Start of sequence</span>}
        <span>{Math.max(1,index+1)} of {clinicalDevScreenList.length}</span>
        {following ? <Link href={`/clinical-tests/dev/${following[0]}`}>Next →</Link> : <span>End of sequence</span>}
      </div>
    </nav>
  );
}
