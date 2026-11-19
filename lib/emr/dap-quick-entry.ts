export const dapLabels={data:'Data (D)',assessment:'Assessment (A)',plan:'Plan (P)'} as const;
export type DapKey=keyof typeof dapLabels;
type Group={id:string;label:string;kind:'multi'|'single';options:readonly string[]};
export const dapGroups:Record<DapKey,readonly Group[]>={
 data:[
  {id:'topics',label:'Information addressed',kind:'multi',options:['Current symptoms','Daily functioning','Relationship concerns','Work or school concerns','Treatment adherence','Coping skills use','Homework follow-through','Other concerns']},
  {id:'participation',label:'Observed participation',kind:'single',options:['Active','Limited','Variable','Declined participation','Not assessed']},
  {id:'behavior',label:'Observed behavior',kind:'multi',options:['Cooperative','Guarded','Restless','Withdrawn','Other behavior']},
 ],
 assessment:[
  {id:'findings',label:'Clinical assessment',kind:'multi',options:['Progress toward goals reported','Progress observed during session','Ongoing functional impairment','Barriers affecting progress','Further assessment needed','Other assessment finding']},
  {id:'response',label:'Response to interventions',kind:'single',options:['Engaged and receptive','Partially engaged','Limited response observed','Response varied','Not evaluated this session']},
  {id:'progress',label:'Progress toward objectives',kind:'single',options:['Improving','Unchanged','Worsening','Not evaluated this session']},
 ],
 plan:[
  {id:'steps',label:'Next steps',kind:'multi',options:['Continue current treatment plan','Assign homework','Review homework next session','Practice coping skills','Coordinate care','Discuss referral','Review treatment plan']},
  {id:'homework',label:'Homework plan',kind:'single',options:['New homework assigned','Continue prior homework','No homework assigned','Not discussed']},
  {id:'followup',label:'Follow-up plan',kind:'single',options:['Keep scheduled follow-up','Schedule next appointment','Contact patient to arrange follow-up','Follow-up as needed']},
 ],
};
export type DapQuick=Record<string,string[]>;
export function assembleDap(quick:DapQuick,narrative:Record<string,string>):Record<string,string>{
 return Object.fromEntries((Object.keys(dapLabels) as DapKey[]).map(key=>{
  const lines=dapGroups[key].flatMap(group=>{const selected=group.options.filter(option=>quick[group.id]?.includes(option));return selected.length?[group.label+': '+selected.join('; ')+'.']:[];});
  if(narrative[key]?.trim())lines.push(narrative[key].trim());return [key,lines.join('\n\n')];
 }));
}
