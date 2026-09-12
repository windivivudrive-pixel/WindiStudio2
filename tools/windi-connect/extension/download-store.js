// Chrome download events and bridge requests share this read/modify/write queue.
// A late event must never overwrite the record created by another request.
export function createDownloadStore(storage){
  let pending=Promise.resolve();
  return function updateDownloads(change){
    const next=pending.then(async()=>{
      const {downloads=[]}=await storage.get('downloads');
      const result=await change(downloads);
      await storage.set({downloads});
      return result;
    });
    pending=next.catch(()=>{});
    return next;
  };
}
