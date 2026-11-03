/** Each queue is permanently bound to one record. Async continuations never read
 * the global form store, so switching patients cannot redirect pending answers. */
export class DsmSaveQueue {
  revision:number;
  lastSaved:string;
  pending=0;
  blocked='';
  errorStatus=0;
  disabled=false;
  private tail:Promise<unknown>=Promise.resolve();
  constructor(readonly id:string,revision:number,initial:Record<string,string>){this.revision=revision;this.lastSaved=JSON.stringify(initial);}
  save(state:Record<string,string>):Promise<number>{
    const text=JSON.stringify(state),captured=JSON.parse(text) as Record<string,string>;
    this.pending++;
    const task=this.tail.then(async()=>{
      if(this.disabled)throw Error('This assessment session is closed.');
      if(this.blocked)throw Error(this.blocked);
      if(text===this.lastSaved)return this.revision;
      const response=await fetch('/api/emr/dsm-records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:this.id,expectedRevision:this.revision,state:captured})});
      const data=await response.json();
      if(!response.ok){this.errorStatus=response.status;const message=data.error||'Record save was not confirmed.';if(response.status===403||response.status===409&&(data.code==='revision_conflict'||message==='Revision conflict'||message.startsWith('Another session')))this.blocked=message;throw Error(message);}
      if(!Number.isInteger(data.revision)||data.revision!==this.revision+1)throw Error('Saved revision could not be verified. Reopen the record before retrying.');
      this.revision=data.revision;this.lastSaved=text;return this.revision;
    });
    this.tail=task.catch(()=>undefined);
    return task.finally(()=>{this.pending--;});
  }
}
