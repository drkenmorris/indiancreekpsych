import KioskIntake from './KioskIntake';

export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 return <KioskIntake token={token}/>;
}
