import {afterEach,beforeEach,expect,test,vi} from 'vitest';

vi.mock('server-only',()=>({}));
import {cartesia,freeCartesiaKeys,mainCartesiaKey,publicVoices} from '../lib/voice/server';

const fetchMock=vi.fn();

test('free pool tries at most five distinct keys after explicit quota rejection',async()=>{
  for(let i=1;i<=5;i++)vi.stubEnv(`CARTESIA_API_KEY_${i}`,`free-${i}`);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async()=>new Response('quota',{status:402}));
  const response=await cartesia('/tts/sse',{method:'POST',body:'{}'});
  expect(response.status).toBe(402);
  expect(fetchMock).toHaveBeenCalledTimes(5);
  expect(new Set(fetchMock.mock.calls.map(([,init])=>new Headers(init.headers).get('Authorization'))).size).toBe(5);
});

test('free pool succeeds on next key but never retries an ambiguous failure',async()=>{
  vi.stubEnv('CARTESIA_API_KEY_1','free-1');vi.stubEnv('CARTESIA_API_KEY_2','free-2');
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(new Response('busy',{status:429})).mockResolvedValueOnce(new Response('audio'));
  expect(await (await cartesia('/tts/sse',{method:'POST',body:'{}'})).text()).toBe('audio');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  fetchMock.mockReset();fetchMock.mockRejectedValue(new Error('timeout'));
  await expect(cartesia('/tts/sse',{method:'POST',body:'{}'})).rejects.toThrow('timeout');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockReset();fetchMock.mockResolvedValue(new Response('server error',{status:500}));
  expect((await cartesia('/tts/sse')).status).toBe(500);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('private and paid voices never fail over to unrelated free accounts',async()=>{
  vi.stubEnv('CARTESIA_API_KEY_MAIN','main-key');vi.stubEnv('CARTESIA_API_KEY_1','free-1');
  fetchMock.mockReset();fetchMock.mockResolvedValue(new Response('quota',{status:402}));
  await cartesia('/tts/sse',{}, {purpose:'main'});
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer main-key');
});

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

test('public catalog accepts nested access and excludes comparison voices',async()=>{
  const { COMPARISON_VOICES, isComparisonVoice } = await import('../lib/voice/shared');
  fetchMock.mockImplementation(async(url:string)=>{
    const language=new URL(url).searchParams.get('language')||'en';
    return new Response(JSON.stringify({data:[{
      id:`00000000-0000-4000-8000-${String(['en','fr','es','ko','th','ja','zh','vi'].indexOf(language)+1).padStart(12,'0')}`,
      name:`Voice ${language}`,description:'Public voice',language,is_owner:false,is_public:true,status:'active',
      access:{type:'public',visibility:'all'},
    }, ...COMPARISON_VOICES.map(voice=>({...voice,is_owner:false,is_public:true,status:'active',access:{type:'public',visibility:'all'}}))],has_more:false,next_page:null}),{headers:{'Content-Type':'application/json'}});
  });
  const result=await publicVoices();
  expect(result.source).toBe('live');
  expect(result.voices).toHaveLength(8);
  expect(result.voices.some(voice=>isComparisonVoice(voice.id))).toBe(false);
  expect(result.voices.some(voice=>voice.language==='vi')).toBe(true);
});

test('comparison voices cannot be resolved or generated, including uppercase IDs', async () => {
  const { publicVoice, resolveVoice } = await import('../lib/voice/server');
  const { COMPARISON_VOICES } = await import('../lib/voice/shared');
  expect(COMPARISON_VOICES).toHaveLength(5);
  for (const voice of COMPARISON_VOICES) {
    for (const id of [voice.id, voice.id.toUpperCase()]) {
      expect(await publicVoice(id)).toBeNull();
      const callsBefore=fetchMock.mock.calls.length;
      await expect(resolveVoice('any-user-including-admin', id)).rejects.toMatchObject({status:403});
      expect(fetchMock.mock.calls).toHaveLength(callsBefore);
    }
  }
});
