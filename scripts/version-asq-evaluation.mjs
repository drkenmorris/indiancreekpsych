import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const paths=['lib/clinical-tests/asq/evaluation.ts','lib/clinical-tests/asq/recipient-versions.json','lib/clinical-tests/legacy/src/assessments/autism/items/autismItemsSelf.ts','lib/clinical-tests/legacy/src/assessments/autism/items/autismItemsTeacher.ts','lib/clinical-tests/legacy/src/asq/parentItems.ts'];
writeFileSync('lib/clinical-tests/asq/evaluation-versions.json',JSON.stringify(Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),null,2)+'\n');
