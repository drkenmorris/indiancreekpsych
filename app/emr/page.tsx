import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
type EntryParams={patient?:string;module?:string;section?:string;bps_page?:string};
const bpsPages=new Set(['symptoms','treatment_history','medications','family_origin','medical_substance','developmental_personal','trauma_history']);
export default async function EmrPage({searchParams}:{searchParams?:Promise<EntryParams>}={}){
 const params=searchParams?await searchParams:{};
 const query=new URLSearchParams();
 if(params.patient)query.set('patient',params.patient);
 // The original BPS assessment is the primary EMR entry; explicit clinical
 // module/section deep links continue to take precedence.
 const module=params.module||'assessment';
 query.set('module',module);
 const section=params.section||(module==='assessment'?'assessment:biopsychosocial':'');
 if(section)query.set('section',section);
 if(section==='assessment:biopsychosocial'&&params.bps_page&&bpsPages.has(params.bps_page))query.set('bps_page',params.bps_page);
 redirect('/emr/workspace?'+query.toString());
}
