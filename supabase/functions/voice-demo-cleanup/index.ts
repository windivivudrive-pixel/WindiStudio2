import {createClient} from 'npm:@supabase/supabase-js@2.84.0';
import {cleanVoiceDemos} from '../_shared/voice-demo-cleanup.ts';
Deno.serve(async request=>{
 const token=Deno.env.get('VOICE_DEMO_CLEANUP_TOKEN');
 if(!token||request.headers.get('authorization')!==`Bearer ${token}`) return new Response('Unauthorized',{status:401});
 if(request.method!=='POST') return new Response('Method not allowed',{status:405});
 const providerKey=Deno.env.get('VOICE_DEMO_PROVIDER_KEY');
 if(!providerKey) return new Response('Worker not configured',{status:503});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try {
  const result=await cleanVoiceDemos({
   claim:async()=>{const {data,error}=await db.rpc('windi_voice_demo_cleanup_claim');if(error)throw error;return data||[];},
   deleteProvider:async row=>{
    const response=await fetch(`https://api.cartesia.ai/voices/${encodeURIComponent(row.provider_id!)}`,{method:'DELETE',headers:{Authorization:`Bearer ${providerKey}`,'Cartesia-Version':'2026-08-14'},signal:AbortSignal.timeout(15000)});
    if(!response.ok&&response.status!==404)throw Error('Provider cleanup failed');
   },
   removeSamples:async paths=>{const {error}=await db.storage.from('windi-voice-previews').remove(paths);if(error)throw error;},
   finish:async(row,success)=>{const {error}=await db.rpc('windi_voice_demo_cleanup_finish',{p_clone:row.id,p_token:row.cleanup_token,p_success:success});if(error)throw error;},
  });
  return Response.json(result,{status:result.failed?503:200});
 } catch {return new Response('Cleanup unavailable',{status:503});}
});
