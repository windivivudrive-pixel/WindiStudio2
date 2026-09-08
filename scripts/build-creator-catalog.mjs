import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash,atomicJson,safeUrl} from './ingestion/core.mjs';

export const purposeNames={social:'Social & Marketing',content:'Content & Viết lách',video:'Video & Phụ đề',audio:'Voice & Âm nhạc',image:'Ảnh & Đồ họa AI',seo:'SEO & Analytics',design:'Design & Frontend',research:'Research & Ý tưởng',automation:'Tự động hóa',tech:'Tech & Bảo mật'};
// Humanizer-inspired prose pass: edit wording only, keep claims, numbers, URLs and source data intact.
// The upstream skill is a Markdown guideline, not executable code in this project.
export function humanizeText(value){
  return String(value)
    .replaceAll(' — ', '. ')
    .replaceAll(' – ', ', ')
    .replaceAll('GỢI Ý ỨNG DỤNG (CHƯA PHẢI CASE STUDY)','Bạn có thể thử')
    .replaceAll('ĐIỂM NỔI BẬT','Điểm đáng chú ý')
    .replaceAll('BẮT ĐẦU','Bắt đầu từ đâu')
    .replaceAll('CẦN BIẾT TRƯỚC KHI DÙNG','Điều cần cân nhắc')
    .replaceAll('Có README chính chủ và số liệu GitHub đã đối chiếu; thứ tự là ưu tiên biên tập, không phải xếp hạng toàn GitHub.','README chính chủ và số liệu GitHub đã được đối chiếu. Thứ tự này là ưu tiên biên tập, không phải bảng xếp hạng toàn GitHub.');
}
export function humanizeDetail(highlights,example,setup,limitations){
  return `Điểm đáng chú ý\n${highlights.map(x=>`• ${humanizeText(x)}`).join('\n')}\n\nBạn có thể thử\n${humanizeText(example)}\n\nBắt đầu từ đâu\n${humanizeText(setup)}\n\nĐiều cần cân nhắc\n${humanizeText(limitations)}`;
}
export function validateProfiles(profiles,metadata,selection){
  if(profiles.length!==100||new Set(profiles.map(x=>x.repo.toLowerCase())).size!==100)throw Error('Expected exactly 100 unique repositories');
  const chosen=metadata.repos.filter(x=>!selection.excluded[x.repo.toLowerCase()]);
  if(chosen.length!==100||chosen.some(x=>!profiles.some(p=>p.repo.toLowerCase()===x.repo.toLowerCase())))throw Error('Selection and profiles differ');
  if(profiles.filter(x=>x.purposes[0]==='tech').length<3||profiles.filter(x=>x.purposes[0]==='tech').length>6)throw Error('Tech quota must be 3–6');
  for(const p of profiles){
    const m=chosen.find(x=>x.repo.toLowerCase()===p.repo.toLowerCase());
    if(!m||m.archived||m.fork||!Number.isSafeInteger(m.stars)||m.stars<0||!Number.isSafeInteger(m.forks)||m.forks<0)throw Error(`Invalid source ${p.repo}`);
    if(!p.purposes.length||p.purposes.some(x=>!purposeNames[x])||new Set(p.purposes).size!==p.purposes.length)throw Error(`Invalid purposes ${p.repo}`);
    for(const field of ['hook','summary','example','setup','limitations'])if(typeof p[field]!=='string'||p[field].length<45)throw Error(`Incomplete ${field}: ${p.repo}`);
    if(p.hook.length>240||p.summary.length<80||p.highlights.length<3||p.highlights.some(x=>x.length<20))throw Error(`Insufficient editorial detail ${p.repo}`);
    if(p.extraSources?.some(x=>!safeUrl(x)))throw Error('Unsafe source');
  }
}
export async function buildCatalog(){
  const selection=JSON.parse(await readFile('data/catalog/creator-selection.json','utf8'));
  const metadata=JSON.parse(await readFile('data/catalog/creator-research/metadata.json','utf8'));
  const reviewed=JSON.parse(await readFile('data/catalog/creator-source-review.json','utf8'));
  const profiles=(await Promise.all((await readdir('data/catalog/editorial')).filter(x=>x.endsWith('.json')).sort().map(async x=>JSON.parse(await readFile(`data/catalog/editorial/${x}`,'utf8'))))).flat();
  validateProfiles(profiles,metadata,selection);
  const editorial=JSON.parse(await readFile('data/catalog/nontech-editorial.json','utf8'));
  for(const p of profiles){
    const revised=editorial.edits.find(e=>e.name===p.name);
    if(revised){p.hook=revised.hook;p.summary=revised.description;if(revised.highlights)p.highlights=revised.highlights;}
  }
  const featured=['charlie947/social-media-skills','coreyhaines31/marketingskills','gitroomhq/postiz-app','remotion-dev/remotion','harry0703/MoneyPrinterTurbo','heygen-com/hyperframes','Comfy-Org/ComfyUI','openai/whisper','m-bain/whisperX','n8n-io/n8n','AgriciDaniel/claude-seo','presenton/presenton'];
  const order=Object.keys(purposeNames);
  const metric=p=>metadata.repos.find(m=>m.repo.toLowerCase()===p.repo.toLowerCase());
  profiles.sort((a,b)=>{
    const ai=featured.indexOf(a.repo),bi=featured.indexOf(b.repo);
    if(ai>=0||bi>=0)return (ai<0?1000:ai)-(bi<0?1000:bi);
    return order.indexOf(a.purposes[0])-order.indexOf(b.purposes[0])||metric(b).stars-metric(a).stars||a.repo.localeCompare(b.repo);
  });
  const resources=[];
  for(const [i,p] of profiles.entries()){
    const m=metric(p),readme=JSON.parse(await readFile(`data/catalog/creator-research/${m.repo.replaceAll('/','--')}.json`,'utf8'));
    if(hash(readme.text)!==readme.sha256||!readme.text.trim()||!safeUrl(readme.url))throw Error(`Missing/changed source ${p.repo}`);
    if(reviewed.sources[m.sourceUrl.toLowerCase()]?.sha256!==readme.sha256)throw Error(`README changed: manually re-review ${p.repo} before rebuilding its Vietnamese article`);
    const identity=`repo:https://github.com/${m.repo.toLowerCase()}`;
    const brief={edition:selection.edition,selected:true,rank:i+1,categories:p.purposes,primaryCategory:p.purposes[0],selectionReason:humanizeText(`Phù hợp ${purposeNames[p.purposes[0]]}: ${p.hook} Có README chính chủ và số liệu GitHub đã đối chiếu; thứ tự là ưu tiên biên tập, không phải xếp hạng toàn GitHub.`),hook:humanizeText(p.hook),highlights:p.highlights.map(humanizeText),example:humanizeText(p.example),setup:humanizeText(p.setup),limitations:humanizeText(p.limitations),github:{stars:m.stars,forks:m.forks,observedAt:m.fetchedAt,url:m.sourceUrl,pushedAt:m.pushedAt,archived:m.archived},readme:{url:readme.url,observedAt:readme.fetchedAt,sha256:readme.sha256},trending:null,extraSources:p.extraSources||[]};
    const license=p.licenseNote||(m.license&&m.license!=='NOASSERTION'?m.license:'Chưa xác nhận giấy phép; cần đọc LICENSE chính chủ trước khi sử dụng.');
    const detail=humanizeDetail(p.highlights,p.example,p.setup,p.limitations);
    resources.push({identity,slug:`${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${hash(identity).slice(0,8)}`,name:p.name,type:p.type||'OPEN_SOURCE',status:'CANDIDATE',tagline:humanizeText(p.hook),description:humanizeText(p.summary),long_description:detail,canonical_url:m.sourceUrl,repository_url:m.sourceUrl,documentation_url:readme.url,owner_name:m.repo.split('/')[0],license,import_metadata:{creatorCatalog:brief,humanizer:{source:'blader/humanizer',version:'2.11.2',mode:'prose-only; claims, numbers, URLs and links preserved'},verification:'official_readme_editorial_not_runtime_tested',securityReview:'NOT_REVIEWED'},sources:[{source_type:'github',source_identifier:`${m.repo}:metadata`,source_url:m.sourceUrl,raw_metadata:{metadataUrl:m.metadataUrl,stars:m.stars,forks:m.forks,license:m.license},fetched_at:m.fetchedAt},{source_type:'github',source_identifier:`${m.repo}:readme:${readme.sha256}`,source_url:readme.url,raw_metadata:{sha256:readme.sha256,relationship:'MAINTAINER'},fetched_at:readme.fetchedAt},...(p.extraSources||[]).map(url=>({source_type:'manual',source_identifier:url,source_url:url,raw_metadata:{relationship:'MAINTAINER',usage:'official_documentation'},fetched_at:metadata.fetchedAt}))]});
  }
  const catalog={edition:selection.edition,scope:selection.scope,criteria:selection.criteria,observedAt:metadata.fetchedAt,count:100,techCount:4,resources};
  catalog.contentHash=hash(JSON.stringify(resources));
  return catalog;
}
export function socialPost(r){
  const b=r.import_metadata.creatorCatalog;
  return `${r.tagline}\n\n${r.description}\n\n${r.long_description}\n\nGitHub: ${b.github.stars.toLocaleString('vi-VN')} sao · ${b.github.forks.toLocaleString('vi-VN')} fork (ghi nhận ${b.github.observedAt}). Đây là tín hiệu quan tâm, không phải số người dùng.\nGiấy phép: ${r.license}\n\nNguồn chính chủ: ${r.repository_url}\nREADME đối chiếu: ${b.readme.url}${b.extraSources.map(x=>`\nTài liệu thêm: ${x}`).join('')}\n\nBiên tập từ tài liệu tác giả; chưa phải review sau khi Windi cài chạy. Chưa xác minh thứ hạng Trending hiện tại.`;
}
async function main(){
  const catalog=await buildCatalog();
  await atomicJson('data/catalog/creator-100.json',catalog);
  await writeFile('data/catalog/CREATOR-100.md',`# Windi Creator 100 — hồ sơ biên tập tiếng Việt\n\n${catalog.scope}\n\n${catalog.criteria.map(x=>`- ${x}`).join('\n')}\n\n100 mục đang chờ duyệt, không tự xuất bản. Mỗi mục gồm bản nội dung có thể biên tập lại để đăng social; nguồn, giấy phép và giới hạn giữ kèm.\n\n${catalog.resources.map((r,i)=>`## ${i+1}. ${r.name}\n\nMục đích: ${r.import_metadata.creatorCatalog.categories.map(x=>purposeNames[x]).join(' · ')}\n\n${socialPost(r)}\n`).join('\n')}`);
  console.log(JSON.stringify({count:catalog.count,tech:catalog.techCount,hash:catalog.contentHash,categories:Object.fromEntries(Object.keys(purposeNames).map(k=>[k,catalog.resources.filter(r=>r.import_metadata.creatorCatalog.primaryCategory===k).length]))}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
