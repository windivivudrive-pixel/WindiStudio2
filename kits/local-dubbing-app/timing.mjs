export function audioInfo(probe){
  const stream=probe.streams?.find(s=>s.codec_type==='audio');
  const [num,den]=String(stream?.time_base||'0/1').split('/').map(Number);
  const exact=Number(stream?.duration_ts)*num/den;
  const duration=Number.isFinite(exact)&&exact>0?exact:Number(stream?.duration||probe.format?.duration);
  const sampleRate=Number(stream?.sample_rate);
  if(!stream||!Number.isFinite(duration)||duration<=0||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('Audio không có thời lượng hoặc sample rate hợp lệ. Tạo lại voice trước khi ghép.');
  return {duration,sampleRate,channels:Number(stream.channels)};
}
export function timingPlan(slot,ttsDuration){
  if(!Number.isFinite(slot)||slot<=0||!Number.isFinite(ttsDuration)||ttsDuration<=0)throw new Error('Thời lượng câu/voice không hợp lệ.');
  const ratio=ttsDuration/slot,requiresRewrite=ratio<.8-1e-6||ratio>1.2+1e-6;
  // Never slow a short voice to fill silence. A longer voice shares compression
  // with the video, retaining the original cross-time-stretch equation.
  const k=Math.sqrt(Math.max(1,ratio)),outputDuration=slot*k;
  return {ratio,audioTempo:k,videoStretch:k,outputDuration,voiceDuration:Math.min(outputDuration,ttsDuration/k),strategy:ratio<1?'natural-pad':'cross',requiresRewrite,rewriteRecommended:ratio<.9-1e-6||ratio>1.1+1e-6};
}

export function assertLocalSampleRate(config,audio){
  const expected=config.ttsProvider==='local'?({v3turbo:48000,v3nano:24000})[config.mode]:null;
  if(expected&&audio.sampleRate!==expected)throw new Error('Sample rate của voice không khớp model đã chọn. Đọc chẩn đoán rồi tạo lại voice đúng model; không đổi header WAV để sửa tốc độ.');
}
