import {modalityAccess} from './modality-access';
export async function groupAccess(){const ctx=await modalityAccess();if(!ctx)return null;const ready=await ctx.supabase.rpc('emr_group_access_ready');return ready.error||ready.data!==true?null:ctx;}
