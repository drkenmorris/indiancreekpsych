import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const paths=['lib/clinical-tests/asq/interpretation.ts','lib/clinical-tests/asq/interpretation-content.ts','lib/clinical-tests/asq/evaluation-versions.json'];
writeFileSync('lib/clinical-tests/asq/interpretation-versions.json',JSON.stringify(Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),null,2)+'\n');
