export type DemoCleanupRow = {id:string;user_id:string;provider_id:string|null;cleanup_token:string};
type CleanupServices = {
 claim:()=>Promise<DemoCleanupRow[]>;
 deleteProvider:(row:DemoCleanupRow)=>Promise<void>;
 removeSamples:(paths:string[])=>Promise<void>;
 finish:(row:DemoCleanupRow,success:boolean)=>Promise<void>;
};
export const cloneSamplePath = (id:string,preset:string) => `clones/${id}/${preset}.mp3`;
export async function cleanVoiceDemos(services:CleanupServices) {
 const rows=await services.claim();let deleted=0,failed=0;
 // Bound provider concurrency. Failed leases are retried by the durable scheduler.
 for(let offset=0;offset<rows.length;offset+=5) {
  await Promise.all(rows.slice(offset,offset+5).map(async row=>{
   let success=false;
   try {
    if(row.provider_id) await services.deleteProvider(row);
    await services.removeSamples(['greeting','news','paid'].map(preset=>cloneSamplePath(row.id,preset)));
    success=true;
   } catch {failed++;}
   try {await services.finish(row,success);if(success)deleted++;}
   catch {if(success)failed++;}
  }));
 }
 return {claimed:rows.length,deleted,failed};
}
