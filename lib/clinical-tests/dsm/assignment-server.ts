import {appropriateProfile} from './profiles';
import {snapshotHash,buildDsmSnapshot,stableJson} from '@/lib/emr/dsm-snapshot';
import {dsmSourceForProfile,dsmRecipientState,type DsmAssignmentSource} from './assignment';
export function checkedDsmSource(value:unknown,hash:string):DsmAssignmentSource{
 const v=value as DsmAssignmentSource;
 if(!v||!['icps-dsm-recipient/1','icps-dsm-recipient/2'].includes(v.format)||snapshotHash(v)!==hash)throw Error('Questionnaire source integrity check failed.');
 // Rebuild from the pinned age band rather than re-age the patient after assignment.
 const profile=appropriateProfile(v.ageBand,v.version==='parent'?'parent':'self');
 if(!profile||profile.id!==v.version||stableJson(dsmSourceForProfile(profile,v.format==='icps-dsm-recipient/1'))!==stableJson(v))throw Error('Questionnaire source has changed; contact the office for a new assignment.');
 return v;
}
export function recipientSnapshot(source:DsmAssignmentSource,answers:Record<string,string>,timestamp:string){return buildDsmSnapshot(dsmRecipientState(source,answers,timestamp));}
