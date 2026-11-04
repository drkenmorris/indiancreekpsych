import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const roots=['lib/clinical-tests/legacy/selfesteem','lib/clinical-tests/legacy/src/assessments/rdii','lib/clinical-tests/legacy/src/assessments/rvti','lib/clinical-tests/legacy/src/features/assessments/srrci','lib/clinical-tests/legacy/src/features/psychometrics/rtafi'];
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]);
const files=Object.fromEntries(roots.flatMap(walk).filter(p=>p.endsWith('.ts')).sort().map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const digest=createHash('sha256').update(JSON.stringify(files)).digest('hex');
const manifest={version:'icps-original-engines/2026-11-04.1',digest,files};
const target='lib/clinical-tests/connected/source-manifest.json';
if(process.argv.includes('--check')){if(readFileSync(target,'utf8')!==JSON.stringify(manifest,null,2)+'\n')throw Error('Original source changed. Review scoring and preserve the previous engine version before updating the manifest.');}else writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
