// Only for Indian Creek's administrator-controlled, synthetic patient account testing.
// Global Auth email-confirmation policy is never changed.
import {createClient} from 'npm:@supabase/supabase-js@2.117.1';

const allowedOrigins=new Set([
 'https://www.indiancreekpsych.com',
 'https://indiancreekpsych.com',
 'http://localhost:3000'
]);
function cors(req:Request){
 const origin=req.headers.get('Origin')??'';
 return {
  'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://www.indiancreekpsych.com',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Vary':'Origin'
 };
}
function respond(req:Request,status:number,payload:Record<string,unknown>){
 return new Response(JSON.stringify(payload),{status,headers:{...cors(req),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
function defaultKey(name:'SUPABASE_PUBLISHABLE_KEYS'|'SUPABASE_SECRET_KEYS'){
 try{
  const o=JSON.parse(Deno.env.get(name)??'{}');
  return typeof o.default==='string'?o.default:null;
 }catch{return null;}
}
function temporaryPassword(){
 const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
 const alphabet='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#';
 return Array.from(bytes,byte=>alphabet[byte%alphabet.length]).join('');
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
 if(req.method!=='POST')return respond(req,405,{error:'Method not permitted'});
 const origin=req.headers.get('Origin');
 if(origin&&!allowedOrigins.has(origin))return respond(req,403,{error:'Origin not permitted'});
 const authorization=req.headers.get('Authorization')??'';
 if(!/^Bearer\s+\S+$/.test(authorization))return respond(req,401,{error:'Sign in required'});
 const url=Deno.env.get('SUPABASE_URL')??'';
 const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||defaultKey('SUPABASE_PUBLISHABLE_KEYS');
 const secretKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||defaultKey('SUPABASE_SECRET_KEYS');
 if(!url||!publicKey||!secretKey)return respond(req,503,{error:'Server configuration unavailable'});
 const scoped=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const token=authorization.replace(/^Bearer\s+/,'');
 const {data:{user},error:userError}=await scoped.auth.getUser(token);
 if(userError||!user)return respond(req,401,{error:'Session is not valid'});
 let action='';
 try{const body=await req.json();action=typeof body?.action==='string'?body.action:'';}catch{return respond(req,400,{error:'Invalid request'})}
 if(action==='status'){
  const {data,error}=await scoped.rpc('patient_test_mode_status');
  return error?respond(req,403,{error:'Administrator verification and second factor required'}):respond(req,200,{state:data});
 }
 if(action==='enable'||action==='disable'){
  const {data,error}=await scoped.rpc('set_patient_test_mode',{p_enable:action==='enable'});
  return error?respond(req,403,{error:'Administrator verification and second factor required'}):respond(req,200,{state:data});
 }
 if(action!=='create')return respond(req,400,{error:'Unknown operation'});
 const {data:expiry,error:slotError}=await scoped.rpc('consume_patient_test_slot');
 if(slotError||!expiry)return respond(req,403,{error:'Test account creation is not enabled or has expired; administrator verification required'});
 const elevated=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const email=`icp-qa-${crypto.randomUUID().replaceAll('-','')}@example.com`;
 const password=temporaryPassword();
 const {data:created,error:createError}=await elevated.auth.admin.createUser({
  email,password,email_confirm:true,
  user_metadata:{registration_type:'patient',full_name:'Synthetic Test Patient'},
  app_metadata:{qa_test_account:true}
 });
 if(createError||!created?.user){
  return respond(req,502,{error:'Unable to create the synthetic test account. The creation allowance was consumed; retry if slots remain.'});
 }
 const {error:registryError}=await scoped.rpc('register_patient_test_account',{p_user_id:created.user.id,p_expires_at:expiry});
 if(registryError){
  await elevated.auth.admin.deleteUser(created.user.id);
  return respond(req,502,{error:'Unable to register the synthetic test account. Creation was rolled back.'});
 }
 // Display these once to the verified administrator; never persist or log passwords.
 return respond(req,200,{email,password,expires_at:expiry,needs_mfa:true});
});
