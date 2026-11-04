import {notFound} from 'next/navigation';
import {patientAccess} from '@/lib/patient/access';
import {isConnectedKey,connectedDefinition} from '@/lib/clinical-tests/connected/definition';
import {hash} from '@/lib/clinical-tests/connected/source';
import ConnectedPreview from '@/app/components/connected/ConnectedPreview';
import '@/app/components/asq/asq-recipient.css';
export default async function Preview({params}:{params:Promise<{key:string}>}){const {key}=await params;if(!isConnectedKey(key))notFound();await patientAccess(true,'/assessment-preview/connected/'+key);return <main className="asqRecipient"><ConnectedPreview testKey={key} sourceHash={hash(connectedDefinition(key))}/></main>;}
