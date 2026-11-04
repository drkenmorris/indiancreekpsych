import {patientAccess} from '@/lib/patient/access';import AsqPreview from '@/app/admin/assign-test/asq-preview/AsqPreview';
export const dynamic='force-dynamic';
export default async function Preview(){await patientAccess(true,'/assessment-preview/asq');return <AsqPreview/>;}
