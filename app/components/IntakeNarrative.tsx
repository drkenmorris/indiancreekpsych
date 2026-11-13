'use client';

import {NOT_APPLICABLE} from '@/lib/patient/intake-progress';

export default function IntakeNarrative({label,value,onChange,allowNA=true,disabled=false,rows=5,maxLength=8000}:{
 label:string;value:string;onChange:(value:string)=>void;allowNA?:boolean;disabled?:boolean;rows?:number;maxLength?:number;
}){
 const checked=value===NOT_APPLICABLE&&allowNA;
 return <div className="intakeNarrative">
  <label>{label}<textarea rows={rows} maxLength={maxLength} value={checked?'':value}
   disabled={disabled||checked} onChange={event=>onChange(event.target.value)}/></label>
  {allowNA&&<label className="checkRow"><input type="checkbox" aria-label={'Not applicable — '+label}
   checked={checked} disabled={disabled} onChange={event=>onChange(event.target.checked?NOT_APPLICABLE:'')}/> Not Applicable</label>}
 </div>;
}
