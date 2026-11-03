'use strict';
const administratorDisclosure=document.querySelector('#administrator-sections');
if(administratorDisclosure){
  const administratorTrigger=administratorDisclosure.querySelector('summary');
  administratorDisclosure.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&administratorDisclosure.open){
      event.preventDefault();administratorDisclosure.open=false;administratorTrigger.focus();
    }
  });
  administratorDisclosure.addEventListener('focusout',event=>{
    if(!administratorDisclosure.contains(event.relatedTarget))administratorDisclosure.open=false;
  });
  administratorDisclosure.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{administratorDisclosure.open=false;}));
  document.addEventListener('pointerdown',event=>{
    if(!administratorDisclosure.contains(event.target))administratorDisclosure.open=false;
  });
}
