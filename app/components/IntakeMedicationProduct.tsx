'use client';

import {useEffect,useState} from 'react';

type Product = [id:string,label:string];
let catalogRequest:Promise<Product[]>|undefined;

// NLM RxNorm Current Prescribable Content snapshot, retrieved 2026-11-12.
// Load once on demand. Search text stays in the browser.
function loadProducts() {
 return catalogRequest ??= fetch('/emr-assets/medication-catalog.json')
  .then(response=>{
   if(!response.ok)throw Error('Medication catalog unavailable');
   return response.json() as Promise<Record<string,string>>;
  })
  .then(catalog=>Object.entries(catalog))
  .catch(error=>{
   catalogRequest=undefined;
   throw error;
  });
}

export default function IntakeMedicationProduct({id,name,value,onChange}:{id:string;name:string;value:string;onChange:(value:string)=>void}) {
 const [products,setProducts]=useState<Product[]>([]);
 const [unavailable,setUnavailable]=useState(false);
 const [active,setActive]=useState(false);

 useEffect(()=>{
  if(!active)return;
  let mounted=true;
  void loadProducts().then(items=>{if(mounted)setProducts(items);},()=>{if(mounted)setUnavailable(true);});
  return ()=>{mounted=false;};
 },[active]);

 const query=value.trim().toLowerCase();
 const words=query.split(/\s+/);
 const startsWithName=(label:string)=>{
  const normalized=label.toLowerCase();
  return normalized.startsWith(query)||normalized.includes('['+query);
 };
 const selected=products.find(([,label])=>label===value);
 const matches=query.length>=2 && !selected ? products
  .filter(([,label])=>words.every(word=>label.toLowerCase().includes(word)))
  .sort(([,a],[,b])=>Number(startsWithName(b))-Number(startsWithName(a))||a.localeCompare(b,undefined,{numeric:true}))
  .slice(0,60) : [];

 return <>
  <div>
  <label htmlFor={id}>Medication
   <input id={id} name={name} maxLength={200} value={value} autoComplete="off" aria-describedby={id+'-help'}
    onFocus={()=>setActive(true)} onChange={event=>{setActive(true);onChange(event.target.value);}}/>
  </label>
  <small id={id+'-help'}>Type a brand or generic name, or enter the name and strength from your label manually.</small>
  </div>
  {active&&query.length>=2&&!selected&&<div>
   {matches.length>0?<fieldset aria-label="Available strengths and forms">
    <legend>Available strengths and forms</legend>
    <div className="medicationProductMatches">
     {matches.map(([code,label])=><button key={code} type="button" className="secondaryAction" onClick={()=>onChange(label)}>{label}</button>)}
    </div>
   </fieldset>:<p role="status">{unavailable?'Catalog unavailable. Use manual entry.':products.length?'No match. Use manual entry.':'Loading medications…'}</p>}
  </div>}
 </>;
}
