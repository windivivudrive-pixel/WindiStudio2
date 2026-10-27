import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ user: { id: '11111111-1111-4111-8111-111111111111' } as { id: string } | null, paid: false, owner: true, admin: false, sku: 'gemini-3m', rpc: vi.fn(), orderQueries: [] as unknown[][] }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) }));
vi.mock('@/lib/voice/server', () => {
  class VoiceError extends Error { constructor(message: string, public status = 400) { super(message); } }
  return { VoiceError, paymentConfig: () => ({ bank: '970422', account: '00123', name: 'TEST' }),
    boundedBody: async (r: Request) => r,
    writer: () => ({ rpc: state.rpc, from: (table: string) => {
      const filters: unknown[][] = [];
      const query = { select: vi.fn().mockReturnThis(), eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        maybeSingle: async () => { state.orderQueries = filters; return { data: table === 'windi_voice_admins' ? state.admin ? { user_id: state.user?.id } : null : table === 'windi_gemini_orders' && state.paid && state.owner ? { activation_id: 'private-inventory-id', product_sku: state.sku, duration_months: state.sku === 'gemini-18m' ? 18 : 3 } : null, error: null }; },
        single: async () => ({ data: table === 'windi_gemini_links' ? { activation_url: 'https://one.google.com/offer/PRIVATEPAIDLINK' } : { id: 'order', status: 'PENDING' }, error: null }),
      }; return query;
    } }),
  };
});
import { parseActivationLinks, GEMINI_TERMS_VERSION, geminiProduct } from '../lib/gemini/shared';
import { GET as download } from '../app/api/gemini/download/route';
import { POST as order } from '../app/api/gemini/order/route';
import { POST as admin } from '../app/api/gemini/admin/route';
import { parseSepayPaymentCode, processSepayWebhook } from '../lib/payments/sepay';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
beforeEach(() => { state.user = { id: '11111111-1111-4111-8111-111111111111' }; state.paid = false; state.owner = true; state.admin = false; state.sku = 'gemini-3m'; state.rpc.mockReset().mockResolvedValue({ data: 'paid', error: null }); });
test('inventory parsing accepts only canonical Google offer links and deduplicates', () => {
  expect(parseActivationLinks(' https://one.google.com/offer/ABCDEFGH1234\r\nhttps://one.google.com/offer/ABCDEFGH1234 ')).toHaveLength(1);
  for (const invalid of ['http://one.google.com/offer/ABCDEFGH', 'https://one.google.com.evil/offer/ABCDEFGH', 'https://one.google.com/offer/ABCDEFGH?x=1', 'https://one.google.com/offer/terms-and-conditions/foo', '', null]) expect(() => parseActivationLinks(invalid)).toThrow();
  const sample18m = 'https://serviceactivation.link/subscription/new/AQCpiIH1uM2A-k7r5Sou1mFNd0jUeAI9qePGZ1U1hiYGJ3LeuXxWTDRUKU_2UTtZJuQzGhsiFShcdt3EvJHmpSbVU9dg8J30rHEH7eDcmLUMVzM7upTMWhMZ0iV3R641L-sjPslXpnG1Jyk6nTHNiKZEmPK5hyesQC4pJU';
  expect(parseActivationLinks(sample18m, 'gemini-18m')).toEqual([sample18m]);
  expect(parseActivationLinks('https://one.google.com/offer/ABCDEFGH1234', 'gemini-18m')).toHaveLength(1);
  expect(() => parseActivationLinks('https://evil.link/subscription/new/12345', 'gemini-18m')).toThrow('serviceactivation.link');
});
test('TXT download requires authentication, paid status and owner filter', async () => {
  state.user = null;
  expect((await download(new Request(`http://localhost/api/gemini/download?order=${id}`))).status).toBe(401);
  state.user = { id: '11111111-1111-4111-8111-111111111111' };
  expect((await download(new Request(`http://localhost/api/gemini/download?order=${id}`))).status).toBe(404);
  state.paid = true; state.owner = false;
  expect((await download(new Request(`http://localhost/api/gemini/download?order=${id}`))).status).toBe(404);
  state.owner = true;
  const response = await download(new Request(`http://localhost/api/gemini/download?order=${id}`));
  expect(response.status).toBe(200); expect(await response.text()).toBe('https://one.google.com/offer/PRIVATEPAIDLINK\n');
  expect(state.orderQueries).toEqual([['id', id], ['user_id', state.user.id], ['status', 'PAID']]);
  expect(response.headers.get('content-disposition')).toContain('.txt'); expect(response.headers.get('cache-control')).toContain('no-store');
});
test('checkout rejects cross-origin requests and missing terms acknowledgement before touching inventory', async () => {
  const post = (origin: string, body: unknown) => new Request('http://localhost/api/gemini/order', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  expect((await order(post('http://evil.example', { termsVersion: GEMINI_TERMS_VERSION }))).status).toBe(403);
  expect((await order(post('http://localhost', {}))).status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
});
test('checkout takes the user from the session and excludes reserved inventory from its response', async () => {
  state.rpc.mockResolvedValueOnce({ data: { id: 'order', activation_id: 'private-inventory-id' }, error: null });
  const response = await order(new Request('http://localhost/api/gemini/order', { method: 'POST', headers: { origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ termsVersion: GEMINI_TERMS_VERSION, user_id: 'other-user', amount: 1 }) }));
  expect(response.status).toBe(201);
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_order', { p_user: state.user!.id, p_sku: 'gemini-3m' });
  expect(await response.json()).toEqual({ order: { id: 'order', status: 'PENDING' } });
});
test('inventory administration requires an existing database admin; a signed-in buyer cannot import stock', async () => {
  const request = () => new Request('http://localhost/api/gemini/admin', { method: 'POST', headers: { origin: 'http://localhost', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'import', links: 'https://one.google.com/offer/ABCDEFGH1234', validUntil: '2030-01-01' }) });
  state.user = null;
  expect((await admin(request())).status).toBe(401);
  state.user = { id: '11111111-1111-4111-8111-111111111111' };
  expect((await admin(request())).status).toBe(403);
  expect(state.rpc).not.toHaveBeenCalled();
});
test('SePay routes Gemini codes separately and ignores ambiguous or outbound transfers', async () => {
  expect(parseSepayPaymentCode('Thanh toan WINDIGAB12CD34')).toEqual({ kind: 'gemini', code: 'WINDI GAB12CD34' });
  expect(parseSepayPaymentCode('WINDI G AB12CD34')).toEqual({ kind: 'gemini', code: 'WINDI GAB12CD34' });
  expect(parseSepayPaymentCode('WINDI GAB12CD34 WINDI KAB12CD34')).toBeNull();
  process.env.SEPAY_API_KEY = 'private-test-sepay-key-00000';
  const webhook = (extra: object = {}, auth = true) => new Request('http://localhost/api/payment-webhook', { method: 'POST', headers: auth ? { Authorization: `Apikey ${process.env.SEPAY_API_KEY}` } : {}, body: JSON.stringify({ id: 112, transferType: 'in', accountNumber: '00123', transferAmount: 150000, content: 'WINDI GAB12CD34', transactionDate: '2026-10-26 22:00:00', ...extra }) });
  await expect(processSepayWebhook(webhook({}, false))).rejects.toThrow();
  expect(await processSepayWebhook(webhook({ transferType: 'out' }))).toEqual({ success: true, status: 'ignored' });
  expect(await processSepayWebhook(webhook({ accountNumber: 'wrong' }))).toEqual({ success: true, status: 'ignored' });
  expect(await processSepayWebhook(webhook())).toEqual({ success: true, status: 'paid' });
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_pay', expect.objectContaining({ p_code: 'WINDI GAB12CD34', p_gateway: '112', p_amount: 150000, p_paid_at: '2026-10-26T15:00:00.000Z' }));
});

test('18-month checkout sends the selected SKU to the database and rejects wrong terms/unknown products', async () => {
  const post=(body:unknown)=>new Request('http://localhost/api/gemini/order',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(body)});
  expect((await order(post({product:'gemini-18m',termsVersion:GEMINI_TERMS_VERSION}))).status).toBe(400);
  expect((await order(post({product:'unknown',termsVersion:GEMINI_TERMS_VERSION}))).status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalled();
  state.rpc.mockResolvedValueOnce({data:{id:'order',activation_id:'private'},error:null});
  expect((await order(post({product:'gemini-18m',termsVersion:geminiProduct('gemini-18m').termsVersion,amount:1}))).status).toBe(201);
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_order',{p_user:state.user!.id,p_sku:'gemini-18m'});
});
test('TXT filename follows the paid order, independently of the currently selected product', async () => {
  state.sku='gemini-18m';state.paid=true;
  const response=await download(new Request(`http://localhost/api/gemini/download?order=${id}&product=gemini-3m`));
  expect(response.status).toBe(200);expect(response.headers.get('content-disposition')).toContain('Gemini-18-thang-');
  expect(await response.text()).toBe('https://one.google.com/offer/PRIVATEPAIDLINK\n');
});

test('authorized stock imports are bound to the 18-month SKU', async () => {
  state.admin=true;state.rpc.mockResolvedValueOnce({data:1,error:null});
  const validUntil=new Date(Date.now()+86400000).toISOString();
  const response=await admin(new Request('http://localhost/api/gemini/admin',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({action:'import',product:'gemini-18m',links:'https://one.google.com/offer/EIGHTEENSTOCK01',validUntil})}));
  expect(response.status).toBe(200);expect(await response.json()).toEqual({added:1,skipped:0});
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_import',{p_urls:['https://one.google.com/offer/EIGHTEENSTOCK01'],p_valid_until:validUntil,p_sku:'gemini-18m'});
});
test('admin enables only the selected product after stock and offer checks', async () => {
  state.admin=true;state.rpc.mockResolvedValue({data:1,error:null});
  const post=(verifiedOffer:boolean)=>new Request('http://localhost/api/gemini/admin',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({action:'settings',product:'gemini-18m',enabled:true,verifiedOffer})});
  expect((await admin(post(false))).status).toBe(400);
  expect(state.rpc).not.toHaveBeenCalledWith('windi_gemini_product_settings',expect.anything());
  expect((await admin(post(true))).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_stock',{p_sku:'gemini-18m'});
  expect(state.rpc).toHaveBeenCalledWith('windi_gemini_product_settings',{p_sku:'gemini-18m',p_enabled:true});
});
