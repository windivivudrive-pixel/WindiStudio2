'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { canSubmitActivation, resolveActivationStatus } from '@/lib/gemini/activation-status';
import styles from './gemini-activation.module.css';

type Task = { requestId: string; status: string; expiry: string | null; failureReason: 'credentials' | 'twofa' | 'authenticator_missing' | 'payment_profile' | null };
const labels: Record<string, string> = { Submitting: 'Đang nâng cấp', Pending: 'Đang nâng cấp', Running: 'Đang nâng cấp', Uncertain: 'Đang nâng cấp', Success: 'Thành công', Failed: 'Thất bại', Cancelled: 'Thất bại' };
const explanations: Record<string, string> = { Submitting: 'Yêu cầu đang được gửi đến hệ thống.', Pending: 'Yêu cầu đã vào hàng chờ xử lý.', Running: 'Hệ thống đang nâng cấp tài khoản của bạn.', Uncertain: 'Hệ thống đang xác minh kết quả. Không gửi yêu cầu mới.', Success: 'Hãy kiểm tra thời hạn trên tài khoản Google và cập nhật mật khẩu, 2FA.', Failed: 'Hệ thống chưa cung cấp nguyên nhân có thể xác định. Vui lòng kiểm tra các mục bên dưới trước khi thử lại.', Cancelled: 'Yêu cầu đã bị hủy. Kiểm tra số lần còn lại trước khi thử lại.' };
class RequestError extends Error { constructor(message: string, public notSubmitted = false) { super(message); } }
const storageKey = 'gemini-activation-request';
export default function ActivationForm() {
  const [code, setCode] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [twofa, setTwofa] = useState(''); const [recovery, setRecovery] = useState('');
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [requestId, setRequestId] = useState(''); const [task, setTask] = useState<Task | null>(null);
  const storageScope = useRef(storageKey);
  const legacyScope = useRef(storageKey);
  const [codeState, setCodeState] = useState<'empty' | 'checking' | 'ready' | 'unavailable' | 'error'>('empty');
  const [checkVersion, setCheckVersion] = useState(0);
  const [retryCheckVersion, setRetryCheckVersion] = useState(0);
  const [retryCheck, setRetryCheck] = useState<{ requestId: string; state: 'ready' | 'unavailable' | 'error' } | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('don');
    if (!id) { setLoadingOrder(false); return; }
    if (!/^[a-f0-9-]{36}$/i.test(id)) { setMessage('Không tìm thấy đơn hàng hợp lệ. Bạn có thể tự nhập mã.'); setLoadingOrder(false); return; }
    storageScope.current = `${storageKey}:${id}`;
    legacyScope.current = storageScope.current;
    const controller = new AbortController();
    fetch('/api/gemini/account', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => {
        const order = data.authenticated && Array.isArray(data.orders) ? data.orders.find((item: { id: string; status: string; product_sku: string; activation_url?: string }) => item.id === id && item.status === 'PAID' && item.product_sku?.startsWith('gemini-managed-') && /^(GEM6|GEM12|GEM24)-[A-Z0-9]{16,128}$/.test(item.activation_url || '')) : null;
        if (!order) { setMessage('Không tìm thấy mã của đơn này. Hãy đăng nhập đúng tài khoản hoặc tự nhập mã.'); return; }
        setCodeState('checking'); setCode(order.activation_url);
      })
      .catch(() => { if (!controller.signal.aborted) setMessage('Chưa tải được mã từ đơn hàng. Hãy thử lại hoặc tự nhập mã.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingOrder(false); });
    return () => controller.abort();
  }, []);
  async function api(body: object) { const response = await fetch('/api/gemini/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new RequestError(data.error || 'Không thể kết nối.', data.notSubmitted === true); return data; }
  const key = code.trim().toUpperCase();
  const terminal = !!task && ['Success', 'Failed', 'Cancelled'].includes(task.status);
  const retryable = !!task && ['Failed', 'Cancelled'].includes(task.status);
  const retryState = retryable && retryCheck?.requestId === task.requestId ? retryCheck.state : 'checking';
  const canSubmit = canSubmitActivation(requestId, task?.requestId === requestId ? task.status : undefined, codeState, retryState);
  useEffect(() => {
    if (loadingOrder || !/^(GEM6|GEM12|GEM24)-[A-Z0-9]{16,128}$/.test(key)) return;
    let stopped = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
        const scope = `${storageKey}:code:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')}`;
        if (stopped) return;
        const saved = sessionStorage.getItem(scope);
        const legacy = sessionStorage.getItem(legacyScope.current) || sessionStorage.getItem(storageKey);
        storageScope.current = scope;
        if (saved) { setRequestId(saved); setCodeState('empty'); return; }
        const historyResponse = await fetch('/api/gemini/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'history', cdkey: key }), cache: 'no-store', signal: controller.signal });
        const history = await historyResponse.json();
        if (!historyResponse.ok || !Array.isArray(history.tasks)) throw new Error();
        const found = history.tasks.find((item: Task) => !['Success', 'Failed', 'Cancelled'].includes(item.status)) || history.tasks.find((item: Task) => item.requestId === legacy);
        if (stopped) return;
        if (found) {
          sessionStorage.setItem(scope, found.requestId);
          if (found.requestId === legacy) {
            if (sessionStorage.getItem(legacyScope.current) === legacy) sessionStorage.removeItem(legacyScope.current);
            if (sessionStorage.getItem(storageKey) === legacy) sessionStorage.removeItem(storageKey);
          }
          setRequestId(found.requestId); setTask(found); setCodeState('empty'); return;
        }
        const balanceResponse = await fetch('/api/gemini/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'balance', cdkey: key }), cache: 'no-store', signal: controller.signal });
        const balance = await balanceResponse.json();
        if (stopped) return;
        if (!balanceResponse.ok) { setCodeState('error'); setMessage(balance.error || 'Chưa kiểm tra được mã. Vui lòng thử lại.'); return; }
        const expectedPlan = ({ GEM6: 'sub6', GEM12: 'sub12', GEM24: 'sub24' } as Record<string, string>)[key.split('-')[0]];
        const result = resolveActivationStatus<Task>(history.tasks, balance, expectedPlan);
        if (result.kind === 'task') {
          sessionStorage.setItem(scope, result.task.requestId); setRequestId(result.task.requestId); setTask(result.task); setCodeState('empty');
        } else if (result.kind === 'unknown') {
          setCodeState('error'); setMessage('Chưa xác nhận được trạng thái mã. Vui lòng liên hệ hỗ trợ hoặc thử lại.');
        } else setCodeState(result.kind);
      } catch {
        if (!stopped) { setCodeState('error'); setMessage('Chưa kiểm tra được mã. Vui lòng thử lại.'); }
      }
    }, 400);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [key, loadingOrder, checkVersion]);
  useEffect(() => {
    if (!requestId || !key || busy || loadingOrder || terminal) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      if (document.hidden) { timer = setTimeout(poll, 15000); return; }
      let delay = 15000;
      try {
        const response = await fetch('/api/gemini/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'history', cdkey: key }), cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.tasks)) throw new Error();
        const found = data.tasks.find((item: Task) => item.requestId === requestId);
        if (!stopped && found) { setTask(found); setMessage(''); if (['Success', 'Failed', 'Cancelled'].includes(found.status)) return; }
        else if (!stopped) setMessage('Chưa tìm thấy yêu cầu tương ứng. Hệ thống sẽ tiếp tục kiểm tra; vui lòng không gửi lại.');
      } catch {
        if (!stopped) { setMessage('Chưa cập nhật được trạng thái. Hệ thống sẽ thử lại; vui lòng không gửi lại yêu cầu.'); delay = 30000; }
      }
      if (!stopped) timer = setTimeout(poll, delay);
    }
    void poll();
    return () => { stopped = true; controller.abort(); clearTimeout(timer); };
  }, [requestId, key, busy, loadingOrder, terminal]);
  useEffect(() => {
    if (!task || !['Failed', 'Cancelled'].includes(task.status) || !key || busy) return;
    const failedId = task.requestId;
    const controller = new AbortController();
    let stopped = false;
    async function checkRetry() {
      try {
        const options = (action: string): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, cdkey: key }), cache: 'no-store', signal: controller.signal });
        const response = await fetch('/api/gemini/activate', options('history'));
        const history = await response.json();
        if (!response.ok || !Array.isArray(history.tasks)) throw new Error();
        const active = history.tasks.find((item: Task) => ['Submitting', 'Pending', 'Running', 'Uncertain'].includes(item.status));
        if (stopped) return;
        if (active) { sessionStorage.setItem(storageScope.current, active.requestId); setRequestId(active.requestId); setTask(active); return; }
        if (!history.tasks.some((item: Task) => item.requestId === failedId && ['Failed', 'Cancelled'].includes(item.status))) throw new Error();
        const balanceResponse = await fetch('/api/gemini/activate', options('balance'));
        const balance = await balanceResponse.json();
        if (!balanceResponse.ok) throw new Error();
        const expectedPlan = ({ GEM6: 'sub6', GEM12: 'sub12', GEM24: 'sub24' } as Record<string, string>)[key.split('-')[0]];
        const result = resolveActivationStatus([], balance, expectedPlan);
        if (!stopped) setRetryCheck({ requestId: failedId, state: result.kind === 'ready' ? 'ready' : result.kind === 'unavailable' ? 'unavailable' : 'error' });
      } catch {
        if (!stopped) setRetryCheck({ requestId: failedId, state: 'error' });
      }
    }
    void checkRetry();
    return () => { stopped = true; controller.abort(); };
  }, [task?.requestId, task?.status, key, busy, retryCheckVersion]);
  async function lookup(id = requestId) { if (!key) { setMessage('Nhập mã kích hoạt để tra cứu.'); return; } setBusy(true); setMessage(''); try { const data = await api({ action: 'history', cdkey: key }); const found = id ? data.tasks.find((item: Task) => item.requestId === id) : data.tasks[0]; if (found) { setTask(found); setRequestId(found.requestId); sessionStorage.setItem(storageScope.current, found.requestId); } else setMessage(id ? 'Chưa thấy yêu cầu trong lịch sử. Nếu vừa gửi, hãy đợi rồi tra cứu lại; không tạo yêu cầu mới khi kết quả chưa rõ.' : 'Chưa có yêu cầu kích hoạt trong lịch sử của mã này.'); } catch (error) { setMessage(error instanceof RequestError ? error.message : 'Chưa tra cứu được. Vui lòng thử lại sau.'); } finally { setBusy(false); } }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (busy || loadingOrder || !consent || !canSubmit) return; const previousTask = task; const previousId = requestId; const id = crypto.randomUUID(); sessionStorage.setItem(storageScope.current, id); setRequestId(id); setTask(null); setRetryCheck(null); setBusy(true); setMessage(''); try { await api({ action: 'submit', cdkey: key, requestId: id, email: email.trim(), password, twofa, recoveryEmail: recovery.trim() }); setPassword(''); setTwofa(''); setMessage('Đã tiếp nhận yêu cầu. Đang kiểm tra kết quả tự động.'); } catch (error) { if (error instanceof RequestError && error.notSubmitted) { if (previousId && previousTask) { sessionStorage.setItem(storageScope.current, previousId); setRequestId(previousId); setTask(previousTask); } else { sessionStorage.removeItem(storageScope.current); setRequestId(''); } setMessage(error.message); } else { setPassword(''); setTwofa(''); setMessage(error instanceof RequestError && !error.message.includes('Chưa xác định') ? `${error.message} Hãy tra cứu trạng thái trước khi gửi lại.` : 'Chưa xác định được kết quả gửi. Hãy tra cứu trạng thái trước khi gửi lại hoặc liên hệ hỗ trợ.'); } } finally { setBusy(false); } }
  function reset() { sessionStorage.removeItem(storageScope.current); setRequestId(''); setTask(null); setMessage(''); if (task?.status === 'Success') { setCode(''); setCodeState('empty'); } else { setCodeState('checking'); setCheckVersion(v => v + 1); } }
  return <main className={styles.page}><nav><Link href="/cua-hang/gemini-dai-han">← Gemini dài hạn</Link></nav><header><span className={styles.eyebrow}>GEMINI · 6 / 12 / 24 THÁNG</span><h1>Kích hoạt gói Gemini</h1><p>Nhập mã đã nhận và thông tin tài khoản cần nâng cấp. Bạn có thể theo dõi kết quả ngay tại đây.</p></header>
    <div className={styles.grid}><section className={styles.card}><h2>Thông tin kích hoạt</h2><p className={styles.note}>Mã bắt đầu bằng GEM6, GEM12 hoặc GEM24.</p><form onSubmit={submit} autoComplete="off"><label>Mã kích hoạt<input required value={code} onChange={e=>{const next = e.target.value.trim().toUpperCase(); setCode(e.target.value); if (next !== key) { setRequestId(''); setTask(null); setMessage(''); setCodeState(/^(GEM6|GEM12|GEM24)-[A-Z0-9]{16,128}$/.test(next) ? 'checking' : 'empty'); }}} disabled={loadingOrder || busy} placeholder={loadingOrder ? "Đang tải mã…" : "GEM6-..."} spellCheck={false} /></label><label>Email Google<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" /></label><label>Mật khẩu Google<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label><label>Khóa 2FA hoặc mã dự phòng<input required type="password" value={twofa} onChange={e=>setTwofa(e.target.value)} autoComplete="off" /><small>Khóa Base32 hoặc mã dự phòng 8 chữ số, nhiều mã ngăn cách bằng dấu /.</small></label><label>Email khôi phục (nếu có)<input type="email" value={recovery} onChange={e=>setRecovery(e.target.value)} /></label><label className={styles.check}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required /><span>Tôi hiểu thông tin tài khoản, mật khẩu và 2FA sẽ được gửi đến đối tác xử lý bên thứ ba để thực hiện nâng cấp.</span></label><button type="submit" disabled={busy || loadingOrder || !canSubmit}>{busy ? 'Đang xử lý…' : 'Gửi yêu cầu kích hoạt'}</button></form></section>
    <aside><section className={styles.card}><h2>Theo dõi yêu cầu</h2><p>Chỉ khi trạng thái là “Thành công” thì quá trình mới hoàn tất.</p>{!requestId && codeState === 'checking' && <div className={`${styles.status} ${styles.pending}`} role="status"><div className={styles.statusHeading}><span className={styles.spinner} aria-hidden="true" /><strong>Đang kiểm tra mã</strong></div></div>}{!requestId && codeState === 'ready' && <div className={`${styles.status} ${styles.success}`} role="status"><strong>Mã đang có hiệu lực</strong><p>Mã còn lượt sử dụng và chưa có yêu cầu đang xử lý.</p></div>}{!requestId && codeState === 'unavailable' && <div className={`${styles.status} ${styles.failure}`} role="status"><strong>Mã đã hết lượt sử dụng</strong><p>Vui lòng liên hệ hỗ trợ nếu cần kiểm tra thêm.</p></div>}{task && <div className={`${styles.status} ${task.status === 'Success' ? styles.success : ['Failed', 'Cancelled'].includes(task.status) ? styles.failure : styles.pending}`} role="status"><div className={styles.statusHeading}>{!terminal && <span className={styles.spinner} aria-hidden="true" />}<strong>{labels[task.status]}</strong></div><p>{task.status === 'Failed' && task.failureReason === 'payment_profile' ? 'Dịch vụ yêu cầu đóng tất cả hồ sơ thanh toán trước khi thử lại.' : task.status === 'Failed' && task.failureReason === 'authenticator_missing' ? 'Lỗi đăng nhập: Không tìm thấy trình xác thực (Google Authenticator).' : task.status === 'Failed' && task.failureReason === 'credentials' ? 'Thông tin đăng nhập không đúng. Hãy kiểm tra tài khoản và mật khẩu Google trước khi thử lại.' : task.status === 'Failed' && task.failureReason === 'twofa' ? 'Mã xác thực 2FA hoặc mã dự phòng không đúng. Hãy kiểm tra lại trước khi thử lại.' : explanations[task.status]}</p>{task.status === 'Failed' && <div className={styles.failureHelp}><strong>Cách kiểm tra</strong>{task.failureReason === 'payment_profile' ? <p>Truy cập <a href="https://myaccount.google.com/paymentmethods" target="_blank" rel="noopener noreferrer">phương thức thanh toán Google ↗</a> để kiểm tra và xóa các phương thức thanh toán đã lưu. Nếu vẫn gặp lỗi, hãy kiểm tra hồ sơ thanh toán hoặc liên hệ hỗ trợ trước khi thử lại.</p> : task.failureReason === 'authenticator_missing' ? <p>Hãy kiểm tra lại khóa 2FA và xác nhận tài khoản Google đã bật xác minh 2 bước, đồng thời đã thiết lập ứng dụng Authenticator.</p> : <ul><li>Đăng nhập Google để kiểm tra email và mật khẩu.</li><li>Kiểm tra khóa 2FA hoặc dùng mã dự phòng 8 chữ số chưa sử dụng.</li><li>Kiểm tra email khôi phục nếu tài khoản yêu cầu.</li><li>Kiểm tra số lượt còn lại; nếu vẫn lỗi, liên hệ hỗ trợ kèm mã yêu cầu bên dưới.</li></ul>}<small>Mã yêu cầu: {task.requestId}</small></div>}{retryable && <p>{retryState === 'checking' ? 'Đang kiểm tra số lượt còn lại…' : retryState === 'ready' ? 'Mã còn lượt. Bạn có thể sửa thông tin và gửi lại.' : retryState === 'unavailable' ? 'Mã đã hết lượt sử dụng. Vui lòng liên hệ hỗ trợ.' : 'Chưa kiểm tra được số lượt. Hãy tra cứu lại trước khi gửi.'}</p>}{task.status === 'Success' && task.expiry && <p>Ngày hết hạn: {task.expiry}</p>}{!terminal && <><div className={styles.loadingTrack} aria-hidden="true"><span /></div><small className={styles.autoUpdate}>Tự động cập nhật khoảng 15 giây/lần</small></>}</div>}{!task && requestId && !busy && <div className={`${styles.status} ${styles.pending}`} role="status"><div className={styles.statusHeading}><span className={styles.spinner} aria-hidden="true" /><strong>Đang kiểm tra yêu cầu</strong></div><p>Đang tìm trạng thái từ hệ thống. Vui lòng chờ và không gửi lại yêu cầu.</p><div className={styles.loadingTrack} aria-hidden="true"><span /></div></div>}{message && <p className={styles.message} role="status">{message}</p>}<button className={styles.secondary} type="button" disabled={busy || !code || codeState === 'checking'} onClick={()=>{ if (retryable && retryState === 'error') { setRetryCheck(null); setRetryCheckVersion(v => v + 1); } else if (!requestId && codeState === 'error') { setMessage(''); setCodeState('checking'); setCheckVersion(v => v + 1); } else void lookup(); }}>Tra cứu trạng thái</button>{task && ['Success','Failed','Cancelled'].includes(task.status) && <button className={styles.secondary} type="button" onClick={reset}>Kích hoạt mã khác hoặc thử lại</button>}<p className={styles.note}>Trang tự cập nhật khi đang mở. Không gửi yêu cầu mới khi trạng thái chưa rõ.</p></section><section className={styles.warning}><h2>Thông tin bảo mật</h2><p>WindiStudio chuyển thông tin bạn nhập đến dịch vụ xử lý bên thứ ba để đăng nhập và nâng cấp tài khoản. Mật khẩu và 2FA có thể cấp quyền truy cập tài khoản Google.</p><p>Chỉ tiếp tục nếu bạn tin tưởng dịch vụ. Nên dùng tài khoản mới và đổi mật khẩu, cập nhật 2FA sau khi hoàn tất.</p><Link href="/cua-hang/gemini-dai-han/huong-dan-2fa">Hướng dẫn lấy 2FA và mã dự phòng →</Link><br /><Link href="/cua-hang/gemini-dai-han/huong-dan-dung-ma">Xem video hướng dẫn →</Link></section></aside></div></main>;
}
