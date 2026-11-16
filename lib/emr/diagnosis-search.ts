import index from './diagnosis-search-index.json';
import type {ReferenceSearchResponse,ReferenceSearchSource} from './diagnosis-search-types';
const normalize=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
const stop=new Set(['a','an','the','of','and','or','for','in','to','with']);
function terms(query:string) {
 const expanded=query.replace(/\bgad\b/gi,'generalized anxiety disorder');
 return [...new Set((normalize(expanded).match(/[a-z0-9]+(?:\.[a-z0-9]+)*/g)??[]).filter(term=>!stop.has(term)))].slice(0,20);
}
const documents=index.documents.map(document=>({...document,body:normalize(document.text),heading:normalize(document.title),context:document.source==='nimh'?'generalized anxiety disorder gad':''}));
function excerpt(text:string,needles:string[]) {
 const flat=text.replace(/\s+/g,' ');
 const positions=needles.map(term=>normalize(flat).indexOf(term)).filter(position=>position>=0);
 const start=Math.max(0,(positions.length?Math.min(...positions):0)-100);
 const end=Math.min(flat.length,start+650);
 return (start?'…':'')+flat.slice(start,end)+(end<flat.length?'…':'');
}
export function searchDiagnosticReferences(query:string,source:ReferenceSearchSource='all',offset=0):ReferenceSearchResponse {
 const needles=terms(query);
 const phrases=[...query.matchAll(/"([^"]+)"/g)].map(match=>normalize(match[1]));
 const ranked=needles.length?documents.filter(document=>source==='all'||document.source===source).flatMap(document=>{
  const searchable=document.heading+' '+document.body+' '+document.context;
  if(!needles.every(term=>searchable.includes(term))||!phrases.every(phrase=>searchable.includes(phrase)))return [];
  const score=needles.reduce((sum,term)=>sum+(document.heading.includes(term)?8:0)+(document.body.includes(term)?2:0),0)
   +(searchable.includes(normalize(query))?5:0)-(document.source==='icd'&&(document.page??0)>=2&&(document.page??0)<=6?20:0);
  return [{document,score}];
 }).sort((a,b)=>b.score-a.score||a.document.id.localeCompare(b.document.id)):[];
 return {query,source,total:ranked.length,offset,checkedOn:index.checkedOn,sources:index.sources,
  results:ranked.slice(offset,offset+10).map(({document})=>({id:document.id,source:document.source,title:document.title,excerpt:excerpt(document.text,needles),url:document.url,page:document.page,kind:document.kind})),
 };
}
