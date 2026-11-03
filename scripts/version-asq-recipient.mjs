import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const base='lib/clinical-tests/legacy/src/';const shared={narrative:hash(base+'asq/narrativeEngine.ts'),legacyResponseOptions:hash(base+'asq/LikertQuestion.tsx')};
const paths={student:['assessments/autism/items/autismItemsSelf.ts','asq/SelfForm.tsx'],parent:['asq/parentItems.ts','asq/ParentForm.tsx'],teacher:['assessments/autism/items/autismItemsTeacher.ts','asq/TeacherForm.tsx']};
writeFileSync('lib/clinical-tests/asq/recipient-versions.json',JSON.stringify(Object.fromEntries(Object.entries(paths).map(([role,[bank,form]])=>[role,{...shared,bank:hash(base+bank),legacyForm:hash(base+form)}])),null,2)+'\n');
