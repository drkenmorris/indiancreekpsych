// Rebuild immutable original prototype source manifests after reviewed source changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=(...paths)=>createHash('sha256').update(paths.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex');
const write=(path,data)=>writeFileSync(path,JSON.stringify(data,null,2)+'\n');
const root='lib/clinical-tests/dsm/';
const bank=JSON.parse(readFileSync(root+'evidence-definition.json','utf8'));
const evidenceHash=hash(root+'evidence-definition.json',root+'evidence.ts','app/clinical-tests/StructuredEvidenceScreen.tsx');
write(root+'tier-two-versions.json',{version:bank.version,sourceKind:'original-structured-evidence',evidenceHash,modules:Object.fromEntries(bank.domains.map(d=>[d.id,evidenceHash]))});
const definition=JSON.parse(readFileSync(root+'differential-definition.json','utf8'));
write(root+'differential-version.json',{version:definition.version,sha256:hash(root+'differential-definition.json'),routingSha256:hash(root+'differential.ts')});
write(root+'review-version.json',{version:'1.0.0',definitionHash:hash(root+'review-definition.json'),engineHash:hash(root+'review.ts'),formulationHash:hash(root+'formulation.ts')});
