'use client';
import {useEffect,useId,useRef} from 'react';
import {EditorContent,useEditor,useEditorState} from '@tiptap/react';
import {Extension} from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle,FontFamily,FontSize} from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import type {RichNode} from '@/lib/emr/treatment-response';
import {fontFamilies,fontSizes} from '@/lib/emr/treatment-response';
const Indent=Extension.create({name:'paragraphIndent',addGlobalAttributes(){return [{types:['paragraph'],attributes:{indent:{default:0,parseHTML:element=>{const pixels=parseFloat(element.style.marginLeft||'0');return Number.isFinite(pixels)?Math.min(8,Math.max(0,Math.round(pixels/24))):0;},renderHTML:attributes=>attributes.indent?{style:`margin-left: ${attributes.indent*24}px`}:{}}}}];}});
const RestrictedFontFamily=FontFamily.extend({addGlobalAttributes(){return (this.parent?.()??[]).map(group=>({...group,attributes:{...group.attributes,fontFamily:{...group.attributes.fontFamily,parseHTML:(element:HTMLElement)=>{const family=element.style.fontFamily.replace(/["']/g,'').split(',')[0].trim();return fontFamilies.find(font=>font.toLowerCase()===family.toLowerCase())??null;}}}}));}});
const RestrictedFontSize=FontSize.extend({addGlobalAttributes(){return (this.parent?.()??[]).map(group=>({...group,attributes:{...group.attributes,fontSize:{...group.attributes.fontSize,parseHTML:(element:HTMLElement)=>{const size=element.style.fontSize;const points=size.endsWith('pt')?parseFloat(size):size.endsWith('px')?parseFloat(size)*.75:NaN;if(!Number.isFinite(points))return null;return [...fontSizes].sort((a,b)=>Math.abs(parseFloat(a)-points)-Math.abs(parseFloat(b)-points))[0];}}}}));}});
export const responseEditorExtensions=[StarterKit.configure({blockquote:false,code:false,codeBlock:false,heading:false,horizontalRule:false,link:false}),TextStyle,RestrictedFontFamily,RestrictedFontSize,TextAlign.configure({types:['paragraph']}),Indent];
export default function RichTextEditor({label,value,onChange,disabled=false}:{label:string;value:RichNode;onChange:(value:RichNode)=>void;disabled?:boolean}) {
 const id=useId();const toolbar=useRef<HTMLDivElement>(null);
 const editor=useEditor({extensions:responseEditorExtensions,content:value,immediatelyRender:false,editable:!disabled,
  editorProps:{attributes:{id:id+'-body',role:'textbox','aria-multiline':'true','aria-labelledby':id+'-label',spellcheck:'true',lang:'en'}},
  onUpdate:({editor})=>onChange(editor.getJSON() as RichNode),
 });
 useEffect(()=>{editor?.setEditable(!disabled,false);},[disabled,editor]);
 const state=useEditorState({editor,selector:({editor:e})=>e?{
  bold:e.isActive('bold'),italic:e.isActive('italic'),underline:e.isActive('underline'),strike:e.isActive('strike'),bullets:e.isActive('bulletList'),
  align:e.getAttributes('paragraph').textAlign??'left',font:e.getAttributes('textStyle').fontFamily??'',size:e.getAttributes('textStyle').fontSize??'',
  undo:e.can().undo(),redo:e.can().redo(),characters:e.getText().length,
 }:null});
 useEffect(()=>{
  const bar=toolbar.current;if(!bar)return;
  // Native focusgroup where available; roving-tabindex fallback elsewhere.
  if('focusGroup' in HTMLElement.prototype)return;
  const items=()=>Array.from(bar.querySelectorAll<HTMLButtonElement>('button'));
  items().forEach((item,index)=>item.tabIndex=index===0?0:-1);
  const focus=(event:FocusEvent)=>{for(const item of items())item.tabIndex=item===event.target?0:-1;};
  const key=(event:KeyboardEvent)=>{
   const list=items(),index=list.indexOf(document.activeElement as HTMLButtonElement);
   if(index<0||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
   const next=event.key==='Home'?0:event.key==='End'?list.length-1:(index+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;
   event.preventDefault();list[next]?.focus();
  };
  bar.addEventListener('focusin',focus);bar.addEventListener('keydown',key);
  return ()=>{bar.removeEventListener('focusin',focus);bar.removeEventListener('keydown',key);};
 },[editor]);
 const action=(title:string,run:()=>void,pressed?:boolean,unavailable=false)=><button type="button" key={title} aria-label={title} aria-pressed={pressed} aria-disabled={disabled||unavailable} onMouseDown={event=>event.preventDefault()} onClick={()=>{if(!disabled&&!unavailable)run();}}>{title}</button>;
 return <section className="responseNarrative">
  <h2 id={id+'-label'}>{label}</h2>
  <div className="responseFontControls">
   <label htmlFor={id+'-font'}>Font <select id={id+'-font'} value={state?.font??''} disabled={disabled||!editor} onChange={event=>{const chain=editor!.chain().focus();if(event.target.value)chain.setFontFamily(event.target.value).run();else chain.unsetFontFamily().run();}}><option value="">Default font</option>{fontFamilies.map(font=><option key={font}>{font}</option>)}</select></label>
   <label htmlFor={id+'-size'}>Font size <select id={id+'-size'} value={state?.size??''} disabled={disabled||!editor} onChange={event=>{const chain=editor!.chain().focus();if(event.target.value)chain.setFontSize(event.target.value).run();else chain.unsetFontSize().run();}}><option value="">Default size (12 pt)</option>{fontSizes.map(size=><option key={size} value={size}>{size.replace('pt',' pt')}</option>)}</select></label>
  </div>
  <div ref={toolbar} role="toolbar" aria-label={label+' formatting'} aria-controls={id+'-body'} {...{'focusgroup':'toolbar wrap'}}>
   <div role="group" aria-label="Text style">
    {action('Bold',()=>editor?.chain().focus().toggleBold().run(),state?.bold)}
    {action('Italic',()=>editor?.chain().focus().toggleItalic().run(),state?.italic)}
    {action('Underline',()=>editor?.chain().focus().toggleUnderline().run(),state?.underline)}
    {action('Strikethrough',()=>editor?.chain().focus().toggleStrike().run(),state?.strike)}
   </div>
   <div role="group" aria-label="Paragraph formatting">
    {action('Bullets',()=>editor?.chain().focus().toggleBulletList().run(),state?.bullets)}
    {(['left','center','right','justify'] as const).map(align=>action(align==='justify'?'Justify':'Align '+align,()=>editor?.chain().focus().setTextAlign(align).run(),state?.align===align))}
    {action('Indent',()=>{if(editor?.isActive('listItem'))editor.chain().focus().sinkListItem('listItem').run();else editor?.chain().focus().updateAttributes('paragraph',{indent:Math.min(8,(editor.getAttributes('paragraph').indent??0)+1)}).run();})}
    {action('Outdent',()=>{if(editor?.isActive('listItem'))editor.chain().focus().liftListItem('listItem').run();else editor?.chain().focus().updateAttributes('paragraph',{indent:Math.max(0,(editor.getAttributes('paragraph').indent??0)-1)}).run();})}
   </div>
   <div role="group" aria-label="Edit history">
    {action('Undo',()=>editor?.chain().focus().undo().run(),undefined,!state?.undo)}
    {action('Redo',()=>editor?.chain().focus().redo().run(),undefined,!state?.redo)}
    {action('Clear formatting',()=>editor?.chain().focus().unsetAllMarks().clearNodes().resetAttributes('paragraph',['textAlign','indent']).run())}
   </div>
  </div>
  <EditorContent editor={editor}/>
  {!editor&&<p role="status">Loading narrative editor…</p>}
  <p className="treatmentHint">{state?.characters??0} / 20,000 characters. Browser spellcheck is enabled. Select text to format it; use Strikethrough to keep revised wording visible.</p>
 </section>;
}
