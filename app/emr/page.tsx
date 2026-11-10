import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
type EntryParams={patient?:string;module?:string;section?:string};
export default async function EmrPage({searchParams}:{searchParams?:Promise<EntryParams>}={}){
 const params=searchParams?await searchParams:{};
 const query=new URLSearchParams();
 for(const key of ['patient','module','section'] as const)if(params[key])query.set(key,params[key]);
 redirect('/emr/workspace'+(query.size?'?'+query.toString():''));
}
