import {patientAccess} from '@/lib/patient/access';import AsqPreview from './AsqPreview';
export const dynamic='force-dynamic';
export default async function Preview(){await patientAccess(true,'/admin/assign-test/asq-preview');return <AsqPreview/>;}
