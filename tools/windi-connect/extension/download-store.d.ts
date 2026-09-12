export function createDownloadStore(storage: {get(key:string):Promise<{downloads?:any[]}>;set(value:{downloads:any[]}):Promise<void>}): <T>(change:(records:any[])=>T|Promise<T>)=>Promise<T>;
