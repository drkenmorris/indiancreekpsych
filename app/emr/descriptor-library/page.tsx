import {patientAccess} from '@/lib/patient/access';

import DescriptorLibrary from './DescriptorLibrary';
import './library.css';
export const dynamic='force-dynamic';
export default async function DescriptorLibraryPage(){await patientAccess(true,'/emr/descriptor-library');return <><main className="descriptorLibrary"><DescriptorLibrary/></main></>;}
