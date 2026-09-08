import {readFile,mkdir} from 'node:fs/promises';
import {createHttp,atomicJson,hash} from './ingestion/core.mjs';

// Read public metadata and documentation only. Never install or execute upstream code.
const pool=JSON.parse(await readFile('data/catalog/creator-research-pool.json','utf8'));
const entries=Object.entries(pool).flatMap(([category,repos])=>repos.map(repo=>({repo,category})));
const http=createHttp({cacheDir:'.cache/windi-creator-research',fresh:process.argv.includes('--fresh')});
await mkdir('data/catalog/creator-research',{recursive:true});
const found=[],missing=[];
for(let i=0;i<entries.length;i+=8){
  const group=entries.slice(i,i+8);
  const query=group.map(x=>`repo:${x.repo}`).join(' ');
  const response=await http(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=100`,{github:true});
  const body=JSON.parse(response.text);
  if(!Array.isArray(body.items)||body.incomplete_results)throw new Error('Incomplete GitHub search; stop without replacing shortlist');
  for(const item of body.items){
    const entry=group.find(x=>x.repo.toLowerCase()===item.full_name.toLowerCase());
    if(!entry)continue; // Renamed repos are resolved manually, not guessed.
    found.push({repo:item.full_name,category:entry.category,stars:item.stargazers_count,forks:item.forks_count,archived:item.archived,fork:item.fork,license:item.license?.spdx_id||null,description:item.description,homepage:item.homepage,branch:item.default_branch,pushedAt:item.pushed_at,topics:item.topics,sourceUrl:item.html_url,metadataUrl:response.url,fetchedAt:response.fetchedAt});
  }
  missing.push(...group.filter(x=>!found.some(f=>f.repo.toLowerCase()===x.repo.toLowerCase())));
  console.log(`Metadata ${Math.min(i+8,entries.length)}/${entries.length}: ${found.length} verified`);
}
if(process.argv.includes('--resolve-missing'))for(const entry of [...missing]){
  try{
    const response=await http(`https://api.github.com/repos/${entry.repo}`,{github:true});
    const item=JSON.parse(response.text);
    if(!item.full_name||item.private)continue;
    if(!found.some(x=>x.repo.toLowerCase()===item.full_name.toLowerCase()))found.push({repo:item.full_name,requestedRepo:entry.repo,category:entry.category,stars:item.stargazers_count,forks:item.forks_count,archived:item.archived,fork:item.fork,license:item.license?.spdx_id||null,description:item.description,homepage:item.homepage,branch:item.default_branch,pushedAt:item.pushed_at,topics:item.topics,sourceUrl:item.html_url,metadataUrl:response.url,fetchedAt:response.fetchedAt});
    missing.splice(missing.indexOf(entry),1);
  }catch(error){if(!error.message.includes('404'))throw error;}
}
await atomicJson('data/catalog/creator-research/metadata.json',{fetchedAt:new Date().toISOString(),repos:found,missing});
for(const [index,row] of found.entries()){
  let document;
  for(const filename of ['README.md','readme.md','README.MD','README.rst','README.markdown']){
    const url=`https://raw.githubusercontent.com/${row.repo}/${row.branch}/${filename}`;
    try{
      const response=await http(url);
      document={repo:row.repo,url:response.url,fetchedAt:response.fetchedAt,sha256:hash(response.text),text:response.text};
      break;
    }catch(error){if(!error.message.includes('404'))throw error;}
  }
  if(document)await atomicJson(`data/catalog/creator-research/${row.repo.replaceAll('/','--')}.json`,document);
  console.log(`README ${index+1}/${found.length}: ${row.repo} ${document?'OK':'MISSING'}`);
}
console.log('Research saved. No database writes and no automatic editorial content generation.');
