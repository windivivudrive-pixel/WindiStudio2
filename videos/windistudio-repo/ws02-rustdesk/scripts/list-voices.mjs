import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../../../../package.json', import.meta.url));
const env = {
  ...require('dotenv').parse(readFileSync(new URL('../../../../.env.local', import.meta.url))),
  ...process.env,
};

const response = await fetch('https://api.cartesia.ai/voices?limit=100&is_owner=true', {
  headers: {
    Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
    'Cartesia-Version': '2026-03-01',
  },
});
if (!response.ok) throw new Error(`Voice list HTTP ${response.status}: ${await response.text()}`);
const body = await response.json();
console.log(JSON.stringify(body.data.map(({id, name, language, created_at}) => ({id, name, language, created_at})), null, 2));
