'use server';
import {revalidatePath} from 'next/cache';
import {editorialWriter,requireEditor} from '@/lib/editorial';
export async function reviewResource(_state:{message:string;ok:boolean},form:FormData) {
  const {user,allowed}=await requireEditor();
  if(!allowed) return {ok:false,message:'Tài khoản không có quyền biên tập.'};
  const id=String(form.get('id')||''),revision=Number(form.get('revision'));
  if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)||!Number.isInteger(revision)) return {ok:false,message:'Thông tin công cụ không hợp lệ.'};
  const content=Object.fromEntries(['name','tagline','description','long_description','license'].map(key=>[key,String(form.get(key)||'').trim()]));
  if(Object.values(content).some(value=>value.length>30000)) return {ok:false,message:'Nội dung quá dài.'};
  const nextState=String(form.get('status')||'');
  const {error}=await editorialWriter().rpc('review_windi_resource',{target_id:id,actor:user.id,expected_revision:revision,next_state:nextState,content,review_reason:'',source_checked:false,content_checked:false});
  if(error) return {ok:false,message:error.code==='40001'?'Tool đã được sửa ở phiên khác. Tải lại trang trước khi lưu.':error.code==='42501'?'Không có quyền ghi biên tập.':'Chưa lưu được. Tải lại hồ sơ rồi thử lại; nếu lỗi lặp lại, kiểm tra kết nối danh mục.'};

  // Update editorial flags
  const isEditorPick = form.get('is_editor_pick') === 'on';
  const isOfficial = form.get('is_official') === 'on';
  await editorialWriter().from('resources').update({
    is_editor_pick: isEditorPick,
    is_official: isOfficial,
  }).eq('id', id);

  // Update or upsert score breakdown if provided
  const rawUtility = form.get('score_utility');
  const rawSetup = form.get('score_setup');
  const rawOriginality = form.get('score_originality');
  const rawAdoption = form.get('score_adoption');
  const overrideReason = String(form.get('editor_override_reason') || '').trim();

  let windiScore: { utility: number; setup: number; originality: number; adoption: number } | null = null;
  if (rawUtility !== null && rawUtility !== '') {
    windiScore = {
      utility: Math.max(0, Math.min(50, Number(rawUtility) || 0)),
      setup: Math.max(0, Math.min(10, Number(rawSetup) || 0)),
      originality: Math.max(0, Math.min(20, Number(rawOriginality) || 0)),
      adoption: Math.max(0, Math.min(20, Number(rawAdoption) || 0)),
    };
  }

  // Update resource with editorial flags and windi_score inside import_metadata
  const { data: currentRes } = await editorialWriter()
    .from('resources')
    .select('import_metadata')
    .eq('id', id)
    .single();

  const nextMetadata = {
    ...(currentRes?.import_metadata || {}),
    windi_score: windiScore,
    editor_override_reason: overrideReason || null,
  };

  await editorialWriter().from('resources').update({
    is_editor_pick: isEditorPick,
    is_official: isOfficial,
    import_metadata: nextMetadata,
  }).eq('id', id);

  // Also upsert into resource_scores if available
  if (windiScore) {
    try {
      await editorialWriter().from('resource_scores').upsert({
        resource_id: id,
        utility: windiScore.utility,
        setup: windiScore.setup,
        originality: windiScore.originality,
        adoption: windiScore.adoption,
        editor_override_reason: overrideReason || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Safely ignore if table does not exist; import_metadata provides reliable storage
    }
  }

  revalidatePath('/admin');revalidatePath(`/admin/resources/${id}`);revalidatePath('/','layout');
  return {ok:true,message:'Đã lưu. Trạng thái và điểm số biên tập (4 tiêu chí) đã được cập nhật vào danh mục.'};
}

export async function requestEasyPromptRegeneration(_state:{message:string;ok:boolean},form:FormData) {
  const {allowed}=await requireEditor();
  if(!allowed) return {ok:false,message:'Tài khoản không có quyền biên tập.'};
  const id=String(form.get('id')||'');
  if(!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return {ok:false,message:'Thông tin công cụ không hợp lệ.'};
  const {error}=await editorialWriter().from('resource_easy_prompts').update({status:'STALE',error_code:null,updated_at:new Date().toISOString()}).eq('resource_id',id);
  if(error) return {ok:false,message:'Chưa gửi được yêu cầu. Hãy thử lại sau.'};
  revalidatePath('/admin');revalidatePath(`/admin/resources/${id}`);revalidatePath('/','layout');
  return {ok:true,message:'Đã đánh dấu cần tạo lại. Chạy batch Easy Prompt để sinh bản mới từ nguồn chính chủ.'};
}
