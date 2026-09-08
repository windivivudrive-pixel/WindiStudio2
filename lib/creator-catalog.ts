export const purposeCategories = [
  {slug:'social',name:'Social & Marketing',description:'Lên lịch bài, phát triển kênh và nuôi cộng đồng.'},
  {slug:'content',name:'Content & Viết lách',description:'Ý tưởng, giọng thương hiệu, kịch bản và bài viết.'},
  {slug:'video',name:'Video & Phụ đề',description:'Tạo, dựng, dịch và tái sử dụng video.'},
  {slug:'audio',name:'Voice & Âm nhạc',description:'Thuyết minh, nhận diện lời nói và xử lý âm thanh.'},
  {slug:'image',name:'Ảnh & Đồ họa AI',description:'Tạo ảnh, chỉnh sửa, nâng chất lượng và hình đại diện.'},
  {slug:'seo',name:'SEO & Analytics',description:'Tìm cơ hội tìm kiếm, đo hiệu quả và tối ưu nội dung.'},
  {slug:'design',name:'Design & Frontend',description:'Landing page, slide, sơ đồ và thiết kế giao diện.'},
  {slug:'research',name:'Research & Ý tưởng',description:'Đọc nguồn, tìm đề tài và tổng hợp nghiên cứu.'},
  {slug:'automation',name:'Tự động hóa',description:'Nối các bước thành quy trình làm việc có kiểm soát.'},
  {slug:'tech',name:'Tech & Bảo mật',description:'Một số công cụ kỹ thuật nổi bật được chọn lọc.'},
] as const;
export type Purpose = typeof purposeCategories[number]['slug'];
export const purposeLabel=(slug:string)=>purposeCategories.find(c=>c.slug===slug)?.name||slug;
export const validPurpose=(value:unknown):value is Purpose=>typeof value==='string'&&purposeCategories.some(c=>c.slug===value);
export type CreatorBrief = {
  edition:'creator-100-v1'; selected:boolean; rank:number; categories:Purpose[]; primaryCategory:Purpose;
  selectionReason:string; hook:string; highlights:string[]; example:string; setup:string; limitations:string;
  github:{stars:number;forks:number;observedAt:string;url:string;pushedAt:string;archived:boolean};
  readme:{url:string;observedAt:string;sha256:string};
  trending:{rank:number;source:string;url:string;observedAt:string;period:string}|null;
  extraSources?:string[];
};
// Metadata is untrusted input, rendered as plain text only. Reject incomplete profiles.
export function creatorBrief(metadata:unknown):CreatorBrief|null{
  if(!metadata||typeof metadata!=='object')return null;
  const c=(metadata as {creatorCatalog?:CreatorBrief}).creatorCatalog;
  if(!c||c.edition!=='creator-100-v1'||!Array.isArray(c.categories)||!c.categories.every(validPurpose)||!validPurpose(c.primaryCategory)||!Array.isArray(c.highlights)||!c.highlights.every(x=>typeof x==='string'))return null;
  if(![c.selectionReason,c.hook,c.example,c.setup,c.limitations,c.github?.observedAt,c.github?.url,c.readme?.url].every(x=>typeof x==='string'))return null;
  if(!Number.isFinite(c.github?.stars)||!Number.isFinite(c.github?.forks)||c.github.stars<0||c.github.forks<0)return null;
  const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
  const url=(v:unknown)=>{try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
  if(typeof c.selected!=='boolean'||!Number.isInteger(c.rank)||c.rank<1||c.rank>100||!c.categories.length||!c.categories.includes(c.primaryCategory)||typeof c.github.archived!=='boolean')return null;
  if(![c.github.observedAt,c.github.pushedAt,c.readme.observedAt].every(date)||!url(c.github.url)||!url(c.readme.url)||!/^[a-f0-9]{64}$/.test(c.readme.sha256))return null;
  if(c.extraSources&&(!Array.isArray(c.extraSources)||!c.extraSources.every(url)))return null;
  if(c.trending!==null&&(!c.trending||!Number.isInteger(c.trending.rank)||c.trending.rank<1||!url(c.trending.url)||!date(c.trending.observedAt)||typeof c.trending.source!=='string'||typeof c.trending.period!=='string'))return null;
  return c;
}
export function normalizeSearch(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim();}
export function matchesPurpose(row:{purposes?:string[]},purpose?:string){return !purpose||Boolean(row.purposes?.includes(purpose));}
export function popularityLabel(brief:CreatorBrief){return `${brief.github.stars.toLocaleString('vi-VN')} sao · ${brief.github.forks.toLocaleString('vi-VN')} fork`;}
