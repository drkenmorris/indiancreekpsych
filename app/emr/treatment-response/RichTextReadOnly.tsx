import type {ReactNode,CSSProperties} from 'react';
import {validRichDoc,type RichNode} from '@/lib/emr/treatment-response';
export default function RichTextReadOnly({value}:{value:RichNode}) {
 if(!validRichDoc(value))return <p>Saved narrative formatting could not be displayed.</p>;
 function render(node:RichNode,key:number):ReactNode {
  const children=node.content?.map(render);
  const style:CSSProperties={textAlign:node.attrs?.textAlign as CSSProperties['textAlign'],marginLeft:node.attrs?.indent?Number(node.attrs.indent)*24:undefined};
  switch(node.type){
   case 'doc':return <div key={key} className="responseReadOnly">{children}</div>;
   case 'paragraph':return <p key={key} style={style}>{children??<br/>}</p>;
   case 'bulletList':return <ul key={key}>{children}</ul>;
   case 'orderedList':return <ol key={key} start={Number(node.attrs?.start??1)}>{children}</ol>;
   case 'listItem':return <li key={key}>{children}</li>;
   case 'hardBreak':return <br key={key}/>;
   case 'text':{
    let text:ReactNode=node.text;
    for(const [i,mark] of (node.marks??[]).entries()){
     if(mark.type==='bold')text=<strong key={i}>{text}</strong>;
     if(mark.type==='italic')text=<em key={i}>{text}</em>;
     if(mark.type==='underline')text=<u key={i}>{text}</u>;
     if(mark.type==='strike')text=<s key={i}>{text}</s>;
     if(mark.type==='textStyle')text=<span key={i} style={{fontFamily:mark.attrs?.fontFamily as string,fontSize:mark.attrs?.fontSize as string}}>{text}</span>;
    }
    return <span key={key}>{text}</span>;
   }
   default:return null;
  }
 }
 return render(value,0);
}
