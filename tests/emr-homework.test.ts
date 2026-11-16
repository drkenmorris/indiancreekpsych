import {expect,test} from 'vitest';
import {homeworkChoices,validHomeworkInput,stableHomeworkJson,type HomeworkPlanVersion} from '@/lib/emr/homework';
import {homeworkVersion} from './fixtures/homework';
const node=(id:string,kind:string,children:any[]=[])=>({id,kind,text:id,source_text:id,children});
test('choices are isolated to the selected problem and objective, including older nested snapshots',()=>{
 const choices=homeworkChoices(homeworkVersion,'p1','o1');expect(choices.problems.map(p=>p.id)).toEqual(['p1','p2']);expect(choices.objectives.map(o=>o.id)).toEqual(['o1','o2']);expect(choices.interventions.map(i=>i.id)).toEqual(['i1','i2']);
 expect(homeworkChoices(homeworkVersion,'p2','o1').interventions).toHaveLength(0);
 const legacy=structuredClone(homeworkVersion);legacy.snapshot.problems[0].children=[node('d','definition',[node('g','goal',[node('old-o','objective',[node('old-i','intervention')])])])] as any;
 expect(homeworkChoices(legacy,'p1','old-o').interventions.map(i=>i.id)).toEqual(['old-i']);
});
test('requires actual assignment text, valid IDs and supported rich text',()=>{
 const body={id:'00000000-0000-4000-8000-000000000030',patientId:'00000000-0000-4000-8000-000000000005',planVersionId:homeworkVersion.id,problemId:'p1',objectiveId:'o1',interventionId:'i1',narrative:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Fictional assignment'}]}]}};
 expect(validHomeworkInput(body)).toBe(true);expect(validHomeworkInput({...body,objectiveId:''})).toBe(false);
 expect(validHomeworkInput({...body,narrative:{type:'doc',content:[{type:'paragraph'}]}})).toBe(false);
 expect(stableHomeworkJson({b:2,a:1})).toBe(stableHomeworkJson({a:1,b:2}));
});
