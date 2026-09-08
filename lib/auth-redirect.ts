export function safeDestination(value: string | null | undefined) {
  if(!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/library';
  try { const url=new URL(value,'https://windi.invalid'); return url.origin==='https://windi.invalid' ? url.pathname+url.search+url.hash : '/library'; } catch { return '/library'; }
}
