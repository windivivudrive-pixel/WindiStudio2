import {afterEach,beforeEach,expect,test,vi} from 'vitest';

vi.mock('server-only',()=>({}));
import {cartesia,freeCartesiaKeys,mainCartesiaKey,publicVoices} from '../lib/voice/server';

const fetchMock=vi.fn();

beforeEach(()=>{
  vi.stubEnv('CARTESIA_API_KEY','test-cartesia-key');
  vi.stubGlobal('fetch',fetchMock);
  fetchMock.mockResolvedValue(new Response('{}'));
});

afterEach(()=>{
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

test('Cartesia requests use Bearer auth and the current supported API version',async()=>{
  await cartesia('/voices',{method:'GET'});
  const [,init]=fetchMock.mock.calls[0] as [string,RequestInit];
  const headers=new Headers(init.headers);
  expect(headers.get('Authorization')).toBe('Bearer test-cartesia-key');
  expect(headers.get('X-API-Key')).toBeNull();
  expect(headers.get('Cartesia-Version')).toBe('2026-08-14');
});

test('main purpose uses the paid-account key and free requests rotate through the free pool',async()=>{
  vi.stubEnv('CARTESIA_API_KEY_MAIN','main-key');
  vi.stubEnv('CARTESIA_API_KEY_1','free-1');
  vi.stubEnv('CARTESIA_API_KEY_2','free-2');
  vi.stubEnv('CARTESIA_API_KEY','');
  expect(mainCartesiaKey()).toBe('main-key');
  expect(freeCartesiaKeys()).toEqual(['free-1','free-2']);
  await cartesia('/voices',{}, {purpose:'main'});
  await cartesia('/voices');
  await cartesia('/voices');
  const auth=(index:number)=>new Headers((fetchMock.mock.calls[index][1] as RequestInit).headers).get('Authorization');
  expect(auth(0)).toBe('Bearer main-key');
  expect(['Bearer free-1','Bearer free-2']).toContain(auth(1));
  expect(['Bearer free-1','Bearer free-2']).toContain(auth(2));
  expect(auth(1)).not.toBe(auth(2));
});

test('tts selects main for an active paid period and a pool key for a welcome-only account',async()=>{
  vi.stubEnv('CARTESIA_API_KEY_MAIN','main-key');
  vi.stubEnv('CARTESIA_API_KEY_1','free-1');
  vi.stubEnv('CARTESIA_API_KEY_2','free-2');
  vi.stubEnv('CARTESIA_API_KEY','');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://supabase.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','service-role-test');
  fetchMock.mockImplementation(async (url:string) => {
    if (url.startsWith('https://supabase.test/')) return Response.json([{id:'paid-period'}]);
    return Response.json({});
  });
  await cartesia('/tts/bytes',{}, {userId:'00000000-0000-4000-8000-000000000001',purpose:'tts'});
  const paidCall=fetchMock.mock.calls.find(([url])=>String(url).startsWith('https://api.cartesia.ai'));
  expect(new Headers(paidCall?.[1]?.headers).get('Authorization')).toBe('Bearer main-key');
  fetchMock.mockImplementation(async (url:string) => {
    if (url.startsWith('https://supabase.test/')) return Response.json([]);
    return Response.json({});
  });
  await cartesia('/tts/bytes',{}, {userId:'00000000-0000-4000-8000-000000000002',purpose:'tts'});
  const calls=fetchMock.mock.calls.filter(([url])=>String(url).startsWith('https://api.cartesia.ai'));
  expect(['Bearer free-1','Bearer free-2']).toContain(new Headers(calls.at(-1)?.[1]?.headers).get('Authorization'));
});

test('public catalog accepts the current nested Cartesia access schema',async()=>{
  fetchMock.mockImplementation(async(url:string)=>{
    const language=new URL(url).searchParams.get('language')||'en';
    return new Response(JSON.stringify({data:[{
      id:`00000000-0000-4000-8000-${String(['en','fr','es','ko','th','ja','zh','vi'].indexOf(language)+1).padStart(12,'0')}`,
      name:`Voice ${language}`,description:'Public voice',language,is_owner:false,is_public:true,status:'active',
      access:{type:'public',visibility:'all'},
    }],has_more:false,next_page:null}),{headers:{'Content-Type':'application/json'}});
  });
  const result=await publicVoices();
  expect(result.source).toBe('live');
  expect(result.voices).toHaveLength(8);
  expect(result.voices.some(voice=>voice.language==='vi')).toBe(true);
});

test('publicVoice resolves each of the 5 comparison showcase voice IDs', async () => {
  const { publicVoice } = await import('../lib/voice/server');
  const { COMPARISON_VOICES } = await import('../lib/voice/shared');

  expect(COMPARISON_VOICES).toHaveLength(5);
  const expectedVoices = [
    { id: 'c61ed9bd-944a-40db-b302-410985821200', name: 'T Min' },
    { id: 'b30f58c7-3a20-4144-a8b2-ee64cf5ae28e', name: 'T Nhi' },
    { id: 'f2a05c6a-fc36-4d1a-b5c4-dd2e5af15af7', name: 'Khoa' },
    { id: '6aee11c6-bef9-4fd0-9f45-1a1c25dcdcde', name: 'Chữa Lành' },
    { id: '293e81de-ef7a-40ec-bdbc-3e641e76256c', name: 'Truyện Ma' },
  ];

  for (const expected of expectedVoices) {
    const voice = await publicVoice(expected.id);
    expect(voice).not.toBeNull();
    expect(voice?.id).toBe(expected.id);
    expect(voice?.name).toBe(expected.name);
    expect(voice?.language).toBe('vi');
    expect(voice?.kind).toBe('public');
  }
});
