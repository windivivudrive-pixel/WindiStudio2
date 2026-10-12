import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { identity, from, storage, entitlement, releases, audit, filters, sign } = vi.hoisted(() => {
  const filters: unknown[][] = [];
  const entitlement = { data: null as null | { id: string; product_id: string }, error: null };
  const releases = { data: [] as Array<Record<string, unknown>>, error: null };
  const audit = { data: null, error: null };
  const sign = vi.fn(async () => ({ data: { signedUrl: 'https://storage.example/private.zip?token=short-lived' }, error: null }));
  return { identity: vi.fn(), from: vi.fn(), storage: { from: vi.fn(() => ({ createSignedUrl: sign })) }, entitlement, releases, audit, filters, sign };
});
vi.mock('../lib/voice/server', () => ({
  identity,
  writer: () => ({ from, storage }),
  VoiceError: class extends Error { constructor(message: string, public status: number) { super(message); } },
  failure: (error: Error & { status?: number }) => Response.json({ error: error.message }, { status: error.status ?? 401 }),
}));
import { GET } from '../app/api/dubbing-kit/download/route';

beforeEach(() => {
  vi.clearAllMocks();
  filters.length = 0;
  entitlement.data = null;
  releases.data = [];
  identity.mockResolvedValue({ user: { id: 'customer-a' } });
  from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters.push([table, key, value]); return chain; },
      maybeSingle: async () => entitlement,
      insert: async () => audit,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(releases).then(resolve),
    };
    return chain;
  });
});

test('no sign-in or no active Dubbing entitlement cannot obtain a signed download', async () => {
  identity.mockRejectedValueOnce(new Error('Sign in required'));
  expect((await GET(new Request('https://windi.test/api/dubbing-kit/download'))).status).toBe(401);
  expect((await GET(new Request('https://windi.test/api/dubbing-kit/download'))).status).toBe(403);
  expect(filters).toEqual(expect.arrayContaining([
    ['product_entitlements', 'user_id', 'customer-a'],
    ['product_entitlements', 'kind', 'local_dubbing_v1'],
    ['product_entitlements', 'status', 'active'],
  ]));
  expect(sign).not.toHaveBeenCalled();
});

test('only published releases of the owned product are signed, briefly, and audited', async () => {
  entitlement.data = { id: 'entitlement-a', product_id: 'dubbing-product' };
  releases.data = [{ id: 'release-a', version: '0.1.0-beta.5', storage_bucket: 'private-releases', storage_path: 'dubbing/beta.5.zip' }];
  const response = await GET(new Request('https://windi.test/api/dubbing-kit/download'));
  expect(response.status).toBe(307);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(filters).toEqual(expect.arrayContaining([
    ['product_releases', 'product_id', 'dubbing-product'],
    ['product_releases', 'is_published', true],
  ]));
  expect(sign).toHaveBeenCalledWith('dubbing/beta.5.zip', 120, { download: 'Windi-Dubbing-Kit-0.1.0-beta.5.zip' });
  expect(from).toHaveBeenCalledWith('product_download_audit');
});

test('an owned kit with no published release returns an actionable error', async () => {
  entitlement.data = { id: 'entitlement-a', product_id: 'dubbing-product' };
  expect((await GET(new Request('https://windi.test/api/dubbing-kit/download'))).status).toBe(503);
  expect(sign).not.toHaveBeenCalled();
});
