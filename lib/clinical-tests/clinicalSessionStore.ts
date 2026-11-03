/** Transient assessment form state. Connected DSM snapshots are persisted by the
 * authenticated record API; no responses are written to browser storage.
 * Server report computation must use a fresh store per request. Other suites
 * retain their existing separate persistence behavior. */
const DSM_KEYS=new Set(['dsm_tier1_draft_v1','dsm_tier1_selection_v1','asq_level1_payload','dsm_tier2_progress_v1','icps_differential_v1','icps_adult_review_v1']);
export function isDsmKey(key:string){return DSM_KEYS.has(key)||/^dsm_tier1_(adult|adolescent_11_17|parent_(6-10|11-17))_(draft|completed)_v1$/.test(key);}
export function createClinicalSessionStore(){
const memory = new Map<string, string>();
const listeners=new Set<()=>void>();let revision=0;
const changed=()=>{revision++;listeners.forEach(fn=>fn());};
return {
  subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},
  revision(){return revision;},
  getItem(key: string): string | null { return memory.get(key) ?? null; },
  setItem(key: string, value: string): void { if(memory.get(key)!==String(value)){memory.set(key,String(value));changed();} },
  removeItem(key: string): void { if(memory.delete(key))changed(); },
  clear(): void { if(memory.size){memory.clear();changed();} },
  exportDsm():Record<string,string>{return Object.fromEntries([...memory].filter(([key])=>isDsmKey(key)));},
  importDsm(payload:Record<string,string>){
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.entries(payload).some(([key,value])=>!isDsmKey(key)||typeof value!=='string'||value.length>4000000))throw Error('Invalid DSM state.');
    for(const key of [...memory.keys()])if(isDsmKey(key))memory.delete(key);
    for(const [key,value] of Object.entries(payload))memory.set(key,value);
    changed();
  },
  /** Isolated ASQ/ASEQ QA state: never include another assessment suite. */
  exportAsq(): Record<string,string> {
    return Object.fromEntries([...memory.entries()].filter(([key]) =>
      key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")
    ));
  },
  /** Replace only ASQ state when restoring an administrator-controlled snapshot. */
  importAsq(payload: Record<string,string>): void {
    for (const key of [...memory.keys()]) {
      if (key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")) memory.delete(key);
    }
    for (const [key,value] of Object.entries(payload)) {
      if ((key.startsWith("asq_") || key.startsWith("sentinel_student_demo_")) &&
          typeof value === "string" && value.length < 1000000) memory.set(key,value);
    }
    changed();
  },
};

}
export const clinicalSessionStore=createClinicalSessionStore();
export type ClinicalSessionStore=ReturnType<typeof createClinicalSessionStore>;
