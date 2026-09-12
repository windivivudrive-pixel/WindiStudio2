import {DatabaseSync} from 'node:sqlite';
import {mkdir,chmod} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {json,now,readJson,type JobKind,type JobStatus,type Provider} from './protocol.ts';

export type ProjectRow={id:string;root:string;output_dir:string;created_at:string;updated_at:string};
export type WorkspaceRow={project_id:string;provider:Provider;url:string;title:string|null;updated_at:string};
export type JobRow={
  id:string;project_id:string;provider:Provider;kind:JobKind;status:JobStatus;request_key:string|null;fingerprint:string;
  prompt:string;source_path:string|null;reference_paths:string;output_path:string;workspace_url:string|null;error_code:string|null;
  user_message:string|null;result_json:string|null;staging_path:string|null;created_at:string;updated_at:string;submitted_at:string|null;completed_at:string|null;
};
export type AssetRow={id:string;job_id:string;project_id:string;provider:Provider;path:string;mime:string;width:number;height:number;sha256:string;created_at:string};
type SqlValue=string|number|null;

export class Store {
  readonly db:DatabaseSync;
  readonly file:string;
  constructor(file:string){this.file=file;this.db=new DatabaseSync(file,{enableForeignKeyConstraints:true});this.migrate();}
  private migrate(){
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, root TEXT NOT NULL UNIQUE, output_dir TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS workspaces (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        provider TEXT NOT NULL, url TEXT NOT NULL, title TEXT,
        updated_at TEXT NOT NULL, PRIMARY KEY(project_id, provider)
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        provider TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL,
        request_key TEXT, fingerprint TEXT NOT NULL, prompt TEXT NOT NULL,
        source_path TEXT, reference_paths TEXT NOT NULL, output_path TEXT NOT NULL,
        workspace_url TEXT, error_code TEXT, user_message TEXT, result_json TEXT,
        staging_path TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        submitted_at TEXT, completed_at TEXT,
        UNIQUE(project_id, request_key)
      );
      CREATE INDEX IF NOT EXISTS jobs_next_idx ON jobs(provider,status,created_at);
      CREATE INDEX IF NOT EXISTS jobs_project_idx ON jobs(project_id,created_at DESC);
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        provider TEXT NOT NULL, path TEXT NOT NULL, mime TEXT NOT NULL,
        width INTEGER NOT NULL, height INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY, job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
        at TEXT NOT NULL, type TEXT NOT NULL, detail TEXT NOT NULL
      );
    `);
    const version=this.getMeta('schema_version');
    if(!version)this.setMeta('schema_version','1');
  }
  close(){this.db.close();}
  private getMeta(key:string){return this.db.prepare('SELECT value FROM meta WHERE key=?').get(key) as {value:string}|undefined;}
  private setMeta(key:string,value:string){this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);}
  transaction<T>(fn:()=>T){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  event(jobId:string|null,type:string,detail:unknown){this.db.prepare('INSERT INTO events(id,job_id,at,type,detail) VALUES(?,?,?,?,?)').run(randomUUID(),jobId,now(),type,json(detail));}
  projectByRoot(root:string){return this.db.prepare('SELECT * FROM projects WHERE root=?').get(root) as ProjectRow|undefined;}
  projectById(id:string){return this.db.prepare('SELECT * FROM projects WHERE id=?').get(id) as ProjectRow|undefined;}
  projectByOtherRoot(id:string,root:string){return this.db.prepare('SELECT * FROM projects WHERE id=? AND root<>?').get(id,root) as ProjectRow|undefined;}
  createProject(id:string,root:string,outputDir:string){const at=now();const row={id,root,output_dir:outputDir,created_at:at,updated_at:at};this.db.prepare('INSERT INTO projects(id,root,output_dir,created_at,updated_at) VALUES(@id,@root,@output_dir,@created_at,@updated_at)').run(row);return row as ProjectRow;}
  relinkProject(id:string,oldRoot:string,newRoot:string){const at=now();this.db.prepare('UPDATE projects SET root=?,updated_at=? WHERE id=? AND root=?').run(newRoot,at,id,oldRoot);return this.projectById(id);}
  workspace(projectId:string,provider:Provider){return this.db.prepare('SELECT * FROM workspaces WHERE project_id=? AND provider=?').get(projectId,provider) as WorkspaceRow|undefined;}
  upsertWorkspace(projectId:string,provider:Provider,url:string,title:string|null){this.db.prepare('INSERT INTO workspaces(project_id,provider,url,title,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(project_id,provider) DO UPDATE SET url=excluded.url,title=excluded.title,updated_at=excluded.updated_at').run(projectId,provider,url,title,now());return this.workspace(projectId,provider)!;}
  insertJob(input:{projectId:string;provider:Provider;kind:JobKind;requestKey?:string;fingerprint:string;prompt:string;sourcePath?:string|null;references:string[];outputPath:string}){
    return this.transaction(()=>{
      if(input.requestKey){
        const prior=this.db.prepare('SELECT * FROM jobs WHERE project_id=? AND request_key=?').get(input.projectId,input.requestKey) as JobRow|undefined;
        if(prior){if(prior.fingerprint!==input.fingerprint)throw new Error('REQUEST_KEY_CONTENT_MISMATCH');return {job:prior,reused:true};}
      }
      const at=now();const job:JobRow={id:randomUUID(),project_id:input.projectId,provider:input.provider,kind:input.kind,status:'queued',request_key:input.requestKey||null,fingerprint:input.fingerprint,prompt:input.prompt,source_path:input.sourcePath||null,reference_paths:json(input.references),output_path:input.outputPath,workspace_url:null,error_code:null,user_message:null,result_json:null,staging_path:null,created_at:at,updated_at:at,submitted_at:null,completed_at:null};
      this.db.prepare(`INSERT INTO jobs(id,project_id,provider,kind,status,request_key,fingerprint,prompt,source_path,reference_paths,output_path,workspace_url,error_code,user_message,result_json,staging_path,created_at,updated_at,submitted_at,completed_at)
        VALUES(@id,@project_id,@provider,@kind,@status,@request_key,@fingerprint,@prompt,@source_path,@reference_paths,@output_path,@workspace_url,@error_code,@user_message,@result_json,@staging_path,@created_at,@updated_at,@submitted_at,@completed_at)`).run(job);
      this.event(job.id,'queued',{provider:job.provider,kind:job.kind});return {job,reused:false};
    });
  }
  job(id:string){return this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id) as JobRow|undefined;}
  jobsForProject(projectId:string,limit=20){return this.db.prepare('SELECT * FROM jobs WHERE project_id=? ORDER BY created_at DESC LIMIT ?').all(projectId,limit) as JobRow[];}
  nextQueued(provider:Provider,lastProject:string|null){return this.db.prepare(`SELECT * FROM jobs WHERE provider=? AND status='queued'
    ORDER BY CASE WHEN project_id=? THEN 1 ELSE 0 END, created_at ASC LIMIT 1`).get(provider,lastProject||'') as JobRow|undefined;}
  updateJob(id:string,patch:Partial<Pick<JobRow,'status'|'workspace_url'|'error_code'|'user_message'|'result_json'|'staging_path'|'submitted_at'|'completed_at'>>){
    const keys=Object.keys(patch) as Array<keyof typeof patch>;if(!keys.length)return this.job(id);
    const values:SqlValue[]=[];const set=keys.map(key=>{values.push(patch[key] as SqlValue);return `${String(key)}=?`;});values.push(now(),id);
    this.db.prepare(`UPDATE jobs SET ${set.join(',')},updated_at=? WHERE id=?`).run(...values);
    const job=this.job(id);if(job)this.event(id,'state',{status:job.status,error:job.error_code});return job;
  }
  cancelJob(id:string){const job=this.job(id);if(!job)throw new Error('JOB_NOT_FOUND');if(['complete','failed','cancelled'].includes(job.status))return job;return this.updateJob(id,{status:'cancelled',user_message:'Đã hủy trong Windi. Provider có thể vẫn hoàn tất yêu cầu đã gửi.'})!;}
  resumeJob(id:string){const job=this.job(id);if(!job)throw new Error('JOB_NOT_FOUND');if(job.status==='unknown_result')return this.updateJob(id,{status:'needs_user_action',error_code:'RESULT_NEEDS_RECONCILIATION',user_message:'Hãy mở tab provider, xác nhận kết quả của yêu cầu này rồi tiếp tục; Windi sẽ không tự gửi lại để tránh tạo ảnh trùng.'})!;
    if(job.status==='cancelled'&&!job.submitted_at)return this.updateJob(id,{status:'queued',error_code:null,user_message:null,completed_at:null})!;
    if(!['needs_user_action','failed'].includes(job.status))throw new Error('JOB_NOT_RESUMABLE');return this.updateJob(id,{status:'queued',error_code:null,user_message:null,...(job.submitted_at?{result_json:JSON.stringify({reconcileExisting:true})}:{})})!;
  }
  retryAfterNoResult(id:string){const job=this.job(id);if(!job)throw new Error('JOB_NOT_FOUND');if(!['unknown_result','needs_user_action'].includes(job.status)||job.error_code!=='RESULT_NEEDS_RECONCILIATION')throw new Error('JOB_NOT_AWAITING_RECONCILIATION');return this.updateJob(id,{status:'queued',error_code:null,user_message:null,submitted_at:null,completed_at:null})!;}
  recoverAfterFoundResult(id:string){const job=this.job(id);if(!job)throw new Error('JOB_NOT_FOUND');const priorRecovery=['failed','needs_user_action'].includes(job.status)&&readJson<{reconcileExisting?:boolean}>(job.result_json,{}).reconcileExisting===true;const awaitingResult=['unknown_result','needs_user_action'].includes(job.status)&&job.error_code==='RESULT_NEEDS_RECONCILIATION';const confirmedSubmittedFailure=['failed','needs_user_action','cancelled'].includes(job.status)&&Boolean(job.submitted_at);if(!priorRecovery&&!awaitingResult&&!confirmedSubmittedFailure)throw new Error('JOB_NOT_AWAITING_RECONCILIATION');return this.updateJob(id,{status:'queued',error_code:null,user_message:null,result_json:JSON.stringify({reconcileExisting:true}),completed_at:null})!;}
  markRunningUnknown(){this.db.prepare(`UPDATE jobs SET status='unknown_result',error_code='RESULT_NEEDS_RECONCILIATION',user_message='Windi vừa khởi động lại sau khi yêu cầu đã được gửi. Kết quả cần được đối chiếu, không gửi lại tự động.',updated_at=? WHERE status IN ('preparing','submitted','generating','downloading')`).run(now());}
  addAsset(input:{job:JobRow;path:string;mime:string;width:number;height:number;sha256:string}){const asset:AssetRow={id:randomUUID(),job_id:input.job.id,project_id:input.job.project_id,provider:input.job.provider,path:input.path,mime:input.mime,width:input.width,height:input.height,sha256:input.sha256,created_at:now()};this.db.prepare('INSERT INTO assets(id,job_id,project_id,provider,path,mime,width,height,sha256,created_at) VALUES(@id,@job_id,@project_id,@provider,@path,@mime,@width,@height,@sha256,@created_at)').run(asset);return asset;}
  assetForJob(jobId:string){return this.db.prepare('SELECT * FROM assets WHERE job_id=?').get(jobId) as AssetRow|undefined;}
  setAsset(input:{job:JobRow;path:string;mime:string;width:number;height:number;sha256:string}){
    const prior=this.assetForJob(input.job.id);const asset:AssetRow={id:prior?.id||randomUUID(),job_id:input.job.id,project_id:input.job.project_id,provider:input.job.provider,path:input.path,mime:input.mime,width:input.width,height:input.height,sha256:input.sha256,created_at:now()};
    this.db.prepare(`INSERT INTO assets(id,job_id,project_id,provider,path,mime,width,height,sha256,created_at)
      VALUES(@id,@job_id,@project_id,@provider,@path,@mime,@width,@height,@sha256,@created_at)
      ON CONFLICT(job_id) DO UPDATE SET path=excluded.path,mime=excluded.mime,width=excluded.width,height=excluded.height,sha256=excluded.sha256,created_at=excluded.created_at`).run(asset);return asset;
  }
  duplicateAsset(projectId:string,provider:Provider,sha256:string,excludeJobId:string){return this.db.prepare('SELECT * FROM assets WHERE project_id=? AND provider=? AND sha256=? AND job_id<>? ORDER BY created_at ASC LIMIT 1').get(projectId,provider,sha256,excludeJobId) as AssetRow|undefined;}
  latestAssets(provider:Provider,limit=3){return this.db.prepare('SELECT * FROM assets WHERE provider=? ORDER BY created_at DESC LIMIT ?').all(provider,limit) as AssetRow[];}
  providerSummary(provider:Provider){
    const counts=this.db.prepare(`SELECT status,COUNT(*) AS count FROM jobs WHERE provider=? GROUP BY status`).all(provider) as Array<{status:JobStatus;count:number}>;
    const total=Object.fromEntries(counts.map(row=>[row.status,row.count]));
    const active=this.db.prepare(`SELECT jobs.*,projects.root FROM jobs JOIN projects ON projects.id=jobs.project_id WHERE provider=? AND status IN ('preparing','submitted','generating','downloading') ORDER BY updated_at DESC LIMIT 1`).get(provider) as (JobRow&{root:string})|undefined;
    const assets=this.latestAssets(provider).map(asset=>{const thumb=`${asset.path}.thumb.jpg`;try{return {...asset,preview:`data:image/jpeg;base64,${readFileSync(thumb).toString('base64')}`};}catch{return asset;}});
    return {queued:total.queued||0,failed:total.failed||0,complete:total.complete||0,active:active?{id:active.id,status:active.status,projectRoot:active.root,outputPath:active.output_path}:null,assets};
  }
  references(job:JobRow){return readJson<string[]>(job.reference_paths,[]);}
}

export async function openStore(file:string){await mkdir(path.dirname(file),{recursive:true,mode:0o700});const store=new Store(file);await chmod(file,0o600).catch(()=>{});return store;}
