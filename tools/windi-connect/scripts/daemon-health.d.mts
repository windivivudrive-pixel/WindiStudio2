import type {NetConnectOpts} from 'node:net';
export function probeDaemon(endpoint:string|NetConnectOpts,options?:{timeout?:number;version?:number}):Promise<{version:number}>;
