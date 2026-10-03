// Executed in the provider page. Conversation prose is deliberately excluded.
export function providerAlerts(){
  const visible=el=>{
    const r=el.getBoundingClientRect();
    if(r.width<=0||r.height<=0)return false;
    const s=window.getComputedStyle(el);
    if(s.visibility==='hidden'||s.display==='none'||s.opacity==='0')return false;
    const p=el.parentElement?window.getComputedStyle(el.parentElement):null;
    if(p&&(p.visibility==='hidden'||p.display==='none'||p.opacity==='0'))return false;
    return true;
  };
  const alerts=[...document.querySelectorAll('[role="alert"],[role="alertdialog"],[data-testid="conversation-turn-error"]')]
    .filter(el=>visible(el)&&!el.closest('[data-message-author-role="user"],.markdown,pre,code'))
    .map(el=>(el.innerText||'').trim()).filter(Boolean);
  if(/\/auth(?:\/|$)|\/login(?:\/|$)/.test(location.pathname))alerts.push('sign in');
  const composer=[...document.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"]')].some(visible);
  if(!composer&&[...document.querySelectorAll('a,button')].filter(visible).some(el=>/^(log in|sign in|đăng nhập)$/i.test((el.innerText||'').trim())))alerts.push('sign in');
  if([...document.querySelectorAll('iframe[title*="challenge" i],iframe[title*="captcha" i]')].some(visible))alerts.push('captcha');
  const flowErrors=[...document.querySelectorAll('mat-card,mat-dialog-container,div')].filter(visible).filter(el=>{
    const t=(el.innerText||'').trim();
    return /unusual activity|you have not been charged|hoạt động bất thường/i.test(t);
  });
  if(flowErrors.length)alerts.push('unusual activity');
  return alerts;
}
