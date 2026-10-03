export type GrokOptions = {
    media: 'image' | 'video';
    aspect: string;
    resolution: string;
    model: string;
    duration?: number;
    quality?: string;
};
export function referencePrompt(prompt: string, count: number) {
    const converted = prompt.replace(/@image\s*(\d+)\b/gi, (_match, n) => { const index = Number(n) - 1; if (index < 0 || index >= count)
        throw new Error('GROK_REFERENCE_NOT_FOUND'); return `<IMAGE_${index}>`; });
    for (const match of converted.matchAll(/<IMAGE_(\d+)>/g))
        if (Number(match[1]) >= count)
            throw new Error('GROK_REFERENCE_NOT_FOUND');
    return converted;
}
export function grokOptions(args: any, referenceCount: number, hasInput: boolean): GrokOptions {
    const media = args.media ?? 'image';
    if (!['image', 'video'].includes(media))
        throw new Error('GROK_INVALID_MEDIA');
    if (referenceCount + (hasInput ? 1 : 0) > (media === 'image' ? 5 : 7))
        throw new Error('GROK_TOO_MANY_REFERENCES');
    if (media === 'video' && referenceCount && hasInput)
        throw new Error('GROK_INPUT_AND_REFERENCES_EXCLUSIVE');
    const aspect = args.aspect ?? '9:16', resolution = args.resolution ?? (media === 'image' ? '1k' : '720p');
    const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', ...(media === 'image' ? ['9:19.5', '19.5:9', '9:20', '20:9', '1:2', '2:1', '21:9', '5:2', 'auto'] : [])];
    if (!ratios.includes(aspect))
        throw new Error('GROK_INVALID_ASPECT');
    if (!(media === 'image' ? ['1k', '2k'] : ['480p', '720p', '1080p']).includes(resolution))
        throw new Error('GROK_INVALID_RESOLUTION');
    const model = args.model ?? (media === 'image' ? 'grok-imagine-image-2.0' : 'grok-imagine-video-1.5');
    if (typeof model !== 'string' || !/^grok-imagine-[a-z0-9.-]+$/.test(model))
        throw new Error('GROK_INVALID_MODEL');
    if (media === 'video') {
        if (args.kind === 'edit')
            throw new Error('GROK_VIDEO_EDIT_UNSUPPORTED');
        if (referenceCount && resolution === '1080p')
            throw new Error('GROK_REFERENCE_VIDEO_MAX_720P');
        const duration = Number(args.duration ?? 8);
        if (!Number.isInteger(duration) || duration < 1 || duration > 15)
            throw new Error('GROK_INVALID_DURATION');
        return { media, aspect, resolution, model, duration };
    }
    const quality = args.quality ?? 'auto';
    if (!['auto', 'low', 'medium'].includes(quality))
        throw new Error('GROK_INVALID_QUALITY');
    return { media, aspect, resolution, model, quality };
}

// Web capabilities are deliberately separate from legacy xAI API options.
export function grokWebOptions(args:any,referenceCount:number,hasInput:boolean):GrokOptions {
    const media=args.media??'image',count=referenceCount+(hasInput?1:0);
    if(!['image','video'].includes(media))throw new Error('GROK_INVALID_MEDIA');
    if(count>8)throw new Error('GROK_TOO_MANY_REFERENCES');
    if(media==='video'&&count>2)throw new Error('GROK_TOO_MANY_REFERENCES');
    const aspect=args.aspect??(media==='video'&&count===1?'auto':'9:16');
    if(media==='video'&&count===1&&aspect!=='auto')throw new Error('GROK_SINGLE_REF_USES_SOURCE_ASPECT');
    if(!['auto','1:1','16:9','9:16','4:3','3:4','3:2','2:3','2:1','1:2','19.5:9','9:19.5','20:9','9:20'].includes(aspect))throw new Error('GROK_INVALID_ASPECT');
    if(args.quality&&args.quality!=='auto')throw new Error('GROK_WEB_QUALITY_UNSUPPORTED');
    if(media==='image'){
      if(args.resolution&&args.resolution!=='1k')throw new Error('GROK_WEB_IMAGE_RESOLUTION_UNSUPPORTED');
      if(args.model&&!['grok-imagine-image-2.0','grok-imagine-image-edit'].includes(args.model))throw new Error('GROK_WEB_MODEL_UNSUPPORTED');
      return {media,aspect,resolution:'1k',model:count?'grok-imagine-image-edit':'grok-imagine-image-2.0'};
    }
    if(args.kind==='edit')throw new Error('GROK_VIDEO_EDIT_UNSUPPORTED');
    const duration=Number(args.duration??6),resolution=args.resolution??'720p';
    if(![6,10,15].includes(duration))throw new Error('GROK_INVALID_DURATION');
    if(!['auto','1:1','16:9','9:16','3:2','2:3'].includes(aspect))throw new Error('GROK_INVALID_ASPECT');
    if(!['480p','720p'].includes(resolution))throw new Error('GROK_WEB_VIDEO_RESOLUTION_UNSUPPORTED');
    if(args.model&&args.model!=='grok-imagine-video')throw new Error('GROK_WEB_MODEL_UNSUPPORTED');
    return {media,aspect,resolution,duration,model:'grok-imagine-video'};
}
export function referenceWebPrompt(prompt:string,count:number){
    // Validate indexes, then describe the ordered inputAssets explicitly. Web does
    // not document the Console API's <IMAGE_0> syntax as an attachment binding.
    referencePrompt(prompt,count);
    const text=prompt.replace(/@image\s*(\d+)\b/gi,(_m,n)=>`reference image ${Number(n)}`).replace(/<IMAGE_(\d+)>/g,(_m,n)=>`reference image ${Number(n)+1}`);
    return count?`The ${count} attached reference images are numbered 1 through ${count} in attachment order.\n${text}`:text;
}
