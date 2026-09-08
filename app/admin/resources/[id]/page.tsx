import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireEditor} from '@/lib/editorial';
import {RetroWindow} from '@/windi/ui/retro';
import {externalHttps} from '@/lib/community-evidence';
import {ReviewForm} from './review-form';
import {creatorBrief} from '@/lib/creator-catalog';
import {CreatorEvidence} from '@/windi/creator-evidence';
import {EasyPromptAdmin} from './easy-prompt-admin';
export const metadata={title:'Biên tập công cụ · Windi',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {client,allowed}=await requireEditor();
  if(!allowed) return <div className="page"><h1>Không có quyền biên tập.</h1></div>;
  const {id}=await params;
  if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) notFound();
  const {data:resource,error}=await client.from('resources').select('id,slug,name,status,type,tagline,description,long_description,license,canonical_url,editorial_revision,import_metadata,is_editor_pick,is_official').eq('id',id).maybeSingle();
  if(error) throw new Error('Không tải được công cụ.'); if(!resource) notFound();
  const brief=creatorBrief(resource.import_metadata);
  const scoreFromMetadata = (resource.import_metadata as any)?.windi_score;
  const [{data:sources,error:sourceError},{data:audit,error:auditError},{data:easyPrompt,error:easyPromptError},{data:scores}]=await Promise.all([
    client.from('resource_sources').select('id,source_type,source_url,fetched_at').eq('resource_id',id),
    client.from('resource_editorial_actions').select('id,next_status,reason,created_at,revision').eq('resource_id',id).order('created_at',{ascending:false}).limit(10),
    client.from('resource_easy_prompts').select('status,prompt_vi,prompt_en,source_url,generated_at').eq('resource_id',id).maybeSingle(),
    client.from('resource_scores').select('utility,setup,originality,adoption,editor_override_reason').eq('resource_id',id).maybeSingle(),
  ]);
  if(sourceError||auditError||easyPromptError) throw new Error('Không tải được nguồn đối chiếu, Easy Prompt hoặc lịch sử duyệt. Vui lòng thử lại.');
  const prompt=easyPrompt?.prompt_vi&&easyPrompt?.prompt_en?{promptVi:easyPrompt.prompt_vi,promptEn:easyPrompt.prompt_en,sourceUrl:easyPrompt.source_url,generatedAt:easyPrompt.generated_at}:null;
  const activeScores = scoreFromMetadata || scores || null;
  return <div className="page"><Link className="text-link" href="/admin">← Hàng đợi</Link><header className="page-intro"><span className="eyebrow">{resource.type} · {resource.status}</span><h1>{resource.name}</h1></header><div className="editor-layout"><RetroWindow title="NỘI DUNG BIÊN TẬP" accent="yellow"><ReviewForm key={resource.editorial_revision} resource={resource} brief={brief} scores={activeScores}/></RetroWindow><aside>{brief&&<CreatorEvidence brief={brief}/>}<EasyPromptAdmin resourceId={id} prompt={prompt} status={(easyPrompt?.status||'PENDING') as 'PENDING'|'GENERATED'|'FAILED'|'STALE'}/><RetroWindow title="ĐỐI CHIẾU NGUỒN" accent="blue"><ul className="detail-list">{sources?.map(s=><li key={s.id}>{externalHttps(s.source_url)?<a className="text-link" target="_blank" rel="noopener noreferrer" href={s.source_url}>{s.source_type} ↗</a>:s.source_type}<p className="small-copy">{new Date(s.fetched_at).toLocaleDateString('vi-VN')}</p></li>)}</ul>{resource.status==='PUBLISHED'&&<Link className="retro-button" href={`/${resource.type==='STACK'?'stack':'tool'}/${resource.slug}`}>Xem trang công khai</Link>}</RetroWindow><RetroWindow title="LỊCH SỬ DUYỆT" accent="green">{audit?.length?audit.map(a=><div className="editor-audit" key={a.id}><strong>{a.next_status} · bản {a.revision}</strong><p>{a.reason}</p><small>{new Date(a.created_at).toLocaleString('vi-VN')}</small></div>):<p>Chưa có quyết định biên tập.</p>}</RetroWindow></aside></div></div>;
}
