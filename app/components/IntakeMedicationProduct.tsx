'use client';

import {useEffect,useState} from 'react';

type Product = [id:string,label:string];
let catalogRequest:Promise<Product[]>|undefined;

// NLM RxNorm Current Prescribable Content snapshot, retrieved 2026-11-12.
// Load once on demand. Search text stays in the browser.
function loadProducts() {
 return catalogRequest ??= import('@/lib/patient/intake-medication-catalog.json')
  .then(module=>Object.entries(module.default))
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
 const selected=products.find(([,label])=>label===value);
 const matches=query.length>=2 && !selected ? products
  .filter(([,label])=>words.every(word=>label.toLowerCase().includes(word)))
  .sort(([,a],[,b])=>Number(b.toLowerCase().startsWith(query))-Number(a.toLowerCase().startsWith(query))||a.localeCompare(b,undefined,{numeric:true}))
  .slice(0,60) : [];

 return <>
  <div>
  <label htmlFor={id}>Medication
   <input id={id} name={name} maxLength={200} value={value} autoComplete="off" aria-describedby={id+'-help'}
    onFocus={()=>setActive(true)} onChange={event=>{setActive(true);onChange(event.target.value);}}/>
  </label>
  <small id={id+'-help'}>Type a brand or generic name, or enter the name and strength from your label manually.</small>
  </div>
  <label htmlFor={id+'-product'}>Available strengths and forms
   <select id={id+'-product'} value={selected?.[1]??''} disabled={!selected&&!matches.length}
    onChange={event=>{if(event.target.value)onChange(event.target.value);}}>
    <option value="" disabled>{unavailable?'Catalog unavailable':!active||query.length<2?'Enter at least two characters':!products.length?'Loading medications…':matches.length||selected?'Choose the product on your label':'No match. Use manual entry.'}</option>
    {(selected?[selected]:matches).map(([code,label])=><option key={code} value={label}>{label}</option>)}
   </select>
  </label>
 </>;
}
