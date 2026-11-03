import {afterEach,expect,test,vi} from 'vitest';import {DsmSaveQueue} from '@/lib/emr/dsm-save-queue';
afterEach(()=>vi.unstubAllGlobals());
const response=(revision:number)=>new Response(JSON.stringify({saved:true,revision}),{status:200});
test('queued states stay bound to their original patient record across overlapping saves and patient switches',async()=>{
 const requests:{id:string;expectedRevision:number;state:Record<string,string>}[]=[],pending:{resolve:(r:Response)=>void}[]=[];
 vi.stubGlobal('fetch',vi.fn((_url:string,options:RequestInit)=>{requests.push(JSON.parse(String(options.body)));return new Promise<Response>(resolve=>pending.push({resolve}));}));
 const old=new DsmSaveQueue('old-record',0,{}),other=new DsmSaveQueue('new-record',0,{}),source={dsm_tier1_selection_v1:'{"patient":"old"}'};
 const first=old.save(source);await Promise.resolve();source.dsm_tier1_selection_v1='{"patient":"mutated-after-enqueue"}';const second=old.save({dsm_tier1_selection_v1:'{"patient":"old-later"}'}),third=other.save({dsm_tier1_selection_v1:'{"patient":"new"}'});await Promise.resolve();
 expect(requests[0].state.dsm_tier1_selection_v1).toContain('old');expect(requests[0].state.dsm_tier1_selection_v1).not.toContain('mutated');expect(requests[1].id).toBe('new-record');pending[1].resolve(response(1));pending[0].resolve(response(1));await Promise.all([first,third]);await Promise.resolve();
 expect(requests[2]).toMatchObject({id:'old-record',expectedRevision:1,state:{dsm_tier1_selection_v1:'{"patient":"old-later"}'}});pending[2].resolve(response(2));await second;expect(old.revision).toBe(2);expect(other.revision).toBe(1);
});
test('conflicts stop queued retries without discarding the captured unsaved state or advancing revision',async()=>{const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'Revision conflict'}),{status:409}));vi.stubGlobal('fetch',fetcher);const queue=new DsmSaveQueue('record',2,{});await expect(queue.save({dsm_tier1_selection_v1:'{"draft":1}'})).rejects.toThrow('Revision conflict');await expect(queue.save({dsm_tier1_selection_v1:'{"draft":2}'})).rejects.toThrow('Revision conflict');expect(fetcher).toHaveBeenCalledTimes(1);expect(queue.revision).toBe(2);expect(queue.lastSaved).toBe('{}');});
