import {readFile} from 'node:fs/promises';
for(const repo of process.argv.slice(2)){
  const source=JSON.parse(await readFile(`data/catalog/creator-research/${repo.replaceAll('/','--')}.json`,'utf8'));
  const text=source.text.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\n{3,}/g,'\n\n');
  console.log(`\nSOURCE ${repo}\n${source.url}\n${text.slice(0,5200)}`);
  const sections=text.split(/(?=^#{1,3} )/m).filter(s=>/^#{1,3} .*?(licens|requirement|limitation|hardware|install|getting started)/i.test(s));
  console.log('\nREQUIREMENTS / LICENSE\n'+sections.map(s=>s.slice(0,1100)).join('\n').slice(0,2200));
}
