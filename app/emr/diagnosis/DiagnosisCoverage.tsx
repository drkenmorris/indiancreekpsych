import {diagnosisCoverage as report} from '@/lib/emr/diagnosis-coverage';
export default function DiagnosisCoverage(){
 return <section>
  <h1>DSM referenced-code coverage audit</h1>
  <p>Checked {report.checkedOn} against {report.catalogVersion}.</p>
  <p>{report.scope}</p>
  <p><strong>{report.missingCurrentCodes.length} current referenced codes are absent from the EMR.</strong> {report.presentCodes} of {report.comparedCodes} literal reference codes are selectable. The other {report.historicalOrCategoryCodes.length} are older codes, nonterminal categories or incomplete examples.</p>
  <p><a href="/api/emr/diagnoses/reference?coverage=1">Download the complete audit as text</a></p>
  <h2>Current referenced codes not selectable in the EMR</h2>
  <p>These include associated medical conditions and encounter codes. A historical DSM reference is not an instruction to use that mapping today. No diagnosis or code is added by viewing this list.</p>
  <div className="diagnosisTableScroll" role="region" aria-label="Missing referenced codes" tabIndex={0}><table className="diagnosisTable coverageTable">
   <caption>{report.missingCurrentCodes.length} absent current ICD-10-CM codes</caption>
   <thead><tr><th scope="col">Code</th><th scope="col">Official FY2027 description</th><th scope="col">Reference</th></tr></thead>
   <tbody>{report.missingCurrentCodes.map(row=><tr key={row.code}><th scope="row">{row.code}</th><td>{row.label}</td><td>{row.references.join('; ')}</td></tr>)}</tbody>
  </table></div>
  <details><summary>Historical and category-code references ({report.historicalOrCategoryCodes.length})</summary>
   <p>These are distinct from missing disorders. Some now require a more specific descendant that is already available.</p>
   <ul>{report.historicalOrCategoryCodes.map(row=><li key={row.code}><strong>{row.code}</strong> — {row.label}. {row.reason}.
    {row.availableDescendants.length>0&&<p>Selectable descendants: {row.availableDescendants.join(', ')}</p>}
   </li>)}</ul>
  </details>
  <h2>Sources and limits</h2>
  <p>This audits literal code coverage, including associated-condition examples. It does not establish complete DSM diagnosis names, conditional code combinations, specifiers, criteria or every code mentioned in the manual. Current ICD validity does not prove a current DSM mapping.</p>
  <ul>{report.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
 </section>;
}
