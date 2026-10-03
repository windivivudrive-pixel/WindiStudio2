export type FlowAspect = 'portrait' | 'landscape' | 'square' | '3x4' | '4x3';
export type FlowModel = 'NARWHAL' | 'GEM_PIX_2' | 'HARBOR_SEAL';
const aspects: Record<string, FlowAspect> = {'9:16':'portrait','16:9':'landscape','1:1':'square','3:4':'3x4','4:3':'4x3',portrait:'portrait',landscape:'landscape',square:'square','3x4':'3x4','4x3':'4x3'};
const models: Record<string, FlowModel> = {narwhal:'NARWHAL',nano_banana_2:'NARWHAL',standard:'NARWHAL',gem_pix_2:'GEM_PIX_2',pro:'GEM_PIX_2',harbor_seal:'HARBOR_SEAL',lite:'HARBOR_SEAL'};
export function flowImageOptions(args: {aspect?:unknown; model?:unknown; seed?:unknown}, prompt: string) {
  let aspect: FlowAspect;
  if (args.aspect !== undefined) {
    aspect = aspects[String(args.aspect).toLowerCase()];
    if (!aspect) throw new Error('FLOW_ASPECT_UNSUPPORTED');
  } else {
    const ratios = [...new Set([...prompt.matchAll(/\b(\d+)\s*[:x×]\s*(\d+)\b/gi)].map(m=>`${m[1]}:${m[2]}`))];
    if (ratios.length > 1) throw new Error('FLOW_ASPECT_AMBIGUOUS');
    if (ratios.length && !aspects[ratios[0]]) throw new Error('FLOW_ASPECT_UNSUPPORTED');
    aspect = ratios.length ? aspects[ratios[0]] : /\b(square|vuông)\b/iu.test(prompt) ? 'square' : /\b(landscape|horizontal)\b|ảnh ngang/iu.test(prompt) ? 'landscape' : 'portrait';
  }
  const model = args.model === undefined ? 'NARWHAL' : models[String(args.model).toLowerCase()];
  if (!model) throw new Error('FLOW_MODEL_UNSUPPORTED');
  if(args.seed !== undefined && (typeof args.seed==='boolean'||args.seed===null||String(args.seed).trim()===''))throw new Error('FLOW_SEED_INVALID');
  const seed = args.seed === undefined ? undefined : Number(args.seed);
  if (seed !== undefined && (!Number.isInteger(seed) || seed < 0 || seed > 2147483647)) throw new Error('FLOW_SEED_INVALID');
  return {aspect, model, ...(seed === undefined ? {} : {seed})};
}
export function flowVariantCount(value: unknown = 1) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new Error('FLOW_COUNT_INVALID');
  return count;
}
export function assertFlowImageAspect(aspect:FlowAspect,width:number,height:number){
 const target={portrait:9/16,landscape:16/9,square:1,'3x4':3/4,'4x3':4/3}[aspect];
 if(!target||!width||!height||Math.abs(width/height/target-1)>0.04)throw new Error('FLOW_IMAGE_ASPECT_MISMATCH');
}
