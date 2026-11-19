import {prognosisFromRecord,validPrognosis} from '@/lib/emr/prognosis';
import RichTextReadOnly from '../treatment-response/RichTextReadOnly';
export type ClinicalRecord=Record<string,unknown>&{id:string;kind:string;created:string;schema?:string};
export default function PrognosisReport({record}:{record:ClinicalRecord|null}){
 if(!record)return <section className="dischargePrognosis"><h3>Latest prognosis report</h3><p>No prognosis report has been recorded for this patient.</p></section>;
 const modern=record.schema==='prognosis/2'&&validPrognosis(prognosisFromRecord(record));
 return <section className="dischargePrognosis"><h3>Latest prognosis report</h3><p>Recorded: {new Date(record.created).toLocaleString('en-US')}</p>{modern?<><dl><dt>Percent of Objectives/Interventions Required for Discharge</dt><dd>{record.discharge_percent==null?'Not entered':String(record.discharge_percent)+'%'}</dd><dt>Projected Number of Sessions Before Treatment End</dt><dd>{String(record.projected_sessions??'Not entered')}</dd><dt>Projected Date of Treatment End</dt><dd>{String(record.projected_end_date||'Not entered')}</dd><dt>Prognosis Rating of Successful Achievement Goals</dt><dd>{String(record.rating||'Not entered')}</dd></dl><h4>Rationale for Prognosis Rating</h4><RichTextReadOnly value={prognosisFromRecord(record).rationale}/></>:<dl>{['statement','supporting_factors','barriers','review_date'].map(key=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{String(record[key]||'Not entered')}</dd></div>)}</dl>}</section>;
}
