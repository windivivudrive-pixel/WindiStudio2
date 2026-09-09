import {afterEach,beforeEach,expect,test,vi} from 'vitest';

vi.mock('server-only',()=>({}));
import {cartesia} from '../lib/voice/server';

const fetchMock=vi.fn();

beforeEach(()=>{
  vi.stubEnv('CARTESIA_API_KEY','test-cartesia-key');
  vi.stubEnv('CARTESIA_VERSION','2026-08-14');
  vi.stubGlobal('fetch',fetchMock);
  fetchMock.mockResolvedValue(new Response('{}'));
});

afterEach(()=>{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test('Cartesia requests use the provider API-key header and configured version',async()=>{
  await cartesia('/voices',{method:'GET'});
  const [,init]=fetchMock.mock.calls[0] as [string,RequestInit];
  const headers=new Headers(init.headers);
  expect(headers.get('X-API-Key')).toBe('test-cartesia-key');
  expect(headers.get('Authorization')).toBeNull();
  expect(headers.get('Cartesia-Version')).toBe('2026-08-14');
});
