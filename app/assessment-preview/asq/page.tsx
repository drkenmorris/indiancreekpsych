import {patientAccess} from '@/lib/patient/access';
import {validAsqRole} from '@/lib/clinical-tests/asq-forms';
import AsqPreview from '@/app/admin/assign-test/asq-preview/AsqPreview';
export const dynamic='force-dynamic';
export default async function Preview({searchParams}:{searchParams:Promise<{version?:string}>}){await patientAccess(true,'/assessment-preview/asq');const {version}=await searchParams;return <AsqPreview role={validAsqRole(version)?version:'student'}/>;}
