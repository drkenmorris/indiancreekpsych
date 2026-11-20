import menu from './menu-data.json';
import {uuid} from '@/lib/emr/demographics';
export const menus=menu as {sections:Record<string,string[][]>;extra:Record<string,string[][]>;modules:Record<string,string[]>};
export function workspaceLink(module:string,key?:string,patient?:string){
 if(module==='prognosis_details'){module='prognosis';key='prognosis';}
 if(module==='group'){const query=new URLSearchParams({section:menus.sections.group.some(s=>s[0]===key)?key!:'administration'});if(uuid(patient))query.set('patient',patient);return '/emr/groups?'+query.toString();}
 const section=key?menus.sections[module]?.find(item=>item[0]===key)??menus.extra[module]?.find(item=>item[0]===key):menus.sections[module]?.find(item=>item[0]!=='patient_directory');
 const query=new URLSearchParams({module:section?.[2]??menus.modules[module]?.[1]??module});
 if(section)query.set('section',module+':'+section[0]);
 if(uuid(patient))query.set('patient',patient);
 if(key==='patient_directory')query.set('directory','1');
 return '/emr/workspace?'+query.toString();
}
export function emrPageLink(path:string,patient?:string){return path+(uuid(patient)?'?patient='+encodeURIComponent(patient):'');}
export function routeSection(path:string,section?:string){
 if(path==='/emr/groups'&&menus.sections.group.some(s=>s[0]===section))return ['group',section!] as [string,string];
 const routes:Record<string,[string,string]>={
  '/emr/patients':['personal','demographics'],'/emr/groups':['administration','teams'],
  '/emr/treatment-planners':['administration','treatment_planners'],'/emr/descriptor-library':['administration','libraries'],
  '/emr/treatment-plan':['plan','problems'],'/emr/treatment-modality':['plan',section==='approach'?'approach':'modality'],
  '/emr/diagnosis':['plan','diagnosis'],'/emr/treatment-response':['plan','response'],'/emr/homework':['plan','homework'],
  '/emr/individual-progress-planner':['notes','planner'],'/emr/soap-notes':['notes','objective_rating'],
  '/emr/bps-intake':['assessment','biopsychosocial'],'/emr/asq':['assessment','assigned_assessments'],'/emr/dsm':['assessment','assigned_assessments'],
 };
 return routes[path]??['personal','demographics'];
}
