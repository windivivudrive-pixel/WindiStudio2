// OAuth protocol adapted from ele-yufo/grokcli. See LICENSE.grokcli.txt.
import { createServer, type Server } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, chmod, lstat } from 'node:fs/promises';
import path from 'node:path';
export type Transport = typeof fetch;
const CLIENT_ID = 'b1a00492-073a-47ea-816f-4c329264a828';
const ISSUER = 'https://auth.x.ai';
const REDIRECT = 'http://127.0.0.1:56121/callback';
export function xaiUrl(value: string) { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.port || !(u.hostname === 'x.ai' || u.hostname.endsWith('.x.ai')))
    throw new Error('GROK_UNTRUSTED_ENDPOINT'); return u.href; }
export function httpError(status: number) { return new Error(status === 401 ? 'GROK_LOGIN_REQUIRED' : status === 403 ? 'GROK_ENTITLEMENT_REQUIRED' : status === 429 ? 'GROK_QUOTA_EXCEEDED' : `GROK_HTTP_${status}`); }
export async function jsonResponse(response: Response) { if (!response.ok)
    throw httpError(response.status); return response.json() as Promise<any>; }
type Tokens = {
    access: string;
    refresh: string;
    expiresAt: number;
    tokenEndpoint: string;
};
export class GrokAuth {
    private tokens: Tokens | null = null;
    private refreshing: Promise<string> | null = null;
    private server: Server | null = null;
    private loginTimer: NodeJS.Timeout | null = null;
    private revision = 0;
    private starting = false;
    error: string | null = null;
    readonly directory: string;
    readonly fetcher: Transport;
    constructor(directory: string, fetcher: Transport = fetch) { this.directory = directory; this.fetcher = fetcher; }
    async load() { try {
        const info = await lstat(path.join(this.directory, 'auth.json'));
        if (info.isSymbolicLink() || !info.isFile())
            throw new Error('GROK_UNSAFE_AUTH_FILE');
        const t = JSON.parse(await readFile(path.join(this.directory, 'auth.json'), 'utf8'));
        if (!t.access || !t.refresh || !Number.isFinite(t.expiresAt))
            throw new Error('GROK_INVALID_AUTH');
        xaiUrl(t.tokenEndpoint);
        this.tokens = t;
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
            this.error = 'GROK_INVALID_AUTH';
    } }
    status() { return { authenticated: Boolean(this.tokens), authPending: Boolean(this.server) || this.starting, expiresAt: this.tokens?.expiresAt ?? null, error: this.error }; }
    private async save(tokens: Tokens, revision: number) { if (revision !== this.revision)
        throw new Error('GROK_LOGIN_CANCELLED'); await mkdir(this.directory, { recursive: true, mode: 0o700 }); const info = await lstat(this.directory); if (info.isSymbolicLink())
        throw new Error('GROK_UNSAFE_AUTH_DIRECTORY'); await chmod(this.directory, 0o700); const temp = path.join(this.directory, `auth-${randomBytes(8).toString('hex')}.tmp`); await writeFile(temp, JSON.stringify(tokens), { mode: 0o600, flag: 'wx' }); if (revision !== this.revision) {
        await rm(temp, { force: true });
        throw new Error('GROK_LOGIN_CANCELLED');
    } await rename(temp, path.join(this.directory, 'auth.json')); this.tokens = tokens; this.error = null; }
    private stopLogin() { if (this.loginTimer)
        clearTimeout(this.loginTimer); this.loginTimer = null; this.server?.close(); this.server = null; }
    async logout() { this.revision++; this.stopLogin(); this.tokens = null; this.error = null; await rm(path.join(this.directory, 'auth.json'), { force: true }); return this.status(); }
    private async exchange(endpoint: string, form: Record<string, string>) { const r = await this.fetcher(xaiUrl(endpoint), { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(20000) }); if (r.status === 400)
        throw new Error('GROK_LOGIN_REQUIRED'); return jsonResponse(r); }
    private normalize(data: any, endpoint: string, previous?: Tokens): Tokens { if (typeof data.access_token !== 'string' || !(data.refresh_token || previous?.refresh))
        throw new Error('GROK_INVALID_TOKEN_RESPONSE'); let seconds = Number(data.expires_in); if (!Number.isFinite(seconds) || seconds <= 0) {
        try {
            seconds = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString()).exp - Date.now() / 1000;
        }
        catch { }
    } return { access: data.access_token, refresh: data.refresh_token || previous!.refresh, expiresAt: Date.now() + Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000, tokenEndpoint: xaiUrl(endpoint) }; }
    async startLogin(onChange: () => void = () => { }) {
        if (this.starting || this.server)
            throw new Error('GROK_LOGIN_ALREADY_PENDING');
        this.starting = true;
        const revision = ++this.revision;
        try {
            let endpoints = { authorization_endpoint: `${ISSUER}/oauth2/authorize`, token_endpoint: `${ISSUER}/oauth2/token` };
            const discovery = await this.fetcher(`${ISSUER}/.well-known/openid-configuration`, { redirect: 'error', signal: AbortSignal.timeout(10000) }).then(jsonResponse).catch(() => null);
            if (discovery) {
                endpoints = { authorization_endpoint: xaiUrl(discovery.authorization_endpoint), token_endpoint: xaiUrl(discovery.token_endpoint) };
            }
            if (revision !== this.revision)
                throw new Error('GROK_LOGIN_CANCELLED');
            const verifier = randomBytes(64).toString('base64url'), challenge = createHash('sha256').update(verifier).digest('base64url'), state = randomBytes(32).toString('hex'), nonce = randomBytes(32).toString('hex');
            let consumed = false;
            const server = createServer((req, res) => {
                void (async () => {
                    const u = new URL(req.url || '/', REDIRECT);
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:56121' || u.pathname !== '/callback' || u.searchParams.get('state') !== state || consumed) {
                        res.writeHead(400).end('Invalid OAuth callback');
                        return;
                    }
                    consumed = true;
                    try {
                        const code = u.searchParams.get('code');
                        if (!code || u.searchParams.has('error'))
                            throw new Error('GROK_LOGIN_DENIED');
                        const data = await this.exchange(endpoints.token_endpoint, { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier, code_challenge: challenge, code_challenge_method: 'S256' });
                        if (data.id_token) {
                            const claims = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64url').toString());
                            if (claims.nonce && claims.nonce !== nonce)
                                throw new Error('GROK_NONCE_MISMATCH');
                        }
                        await this.save(this.normalize(data, endpoints.token_endpoint), revision);
                        res.end('Đã kết nối Grok với Windi. Bạn có thể đóng tab này.');
                    }
                    catch (e) {
                        this.error = e instanceof Error && e.message.startsWith('GROK_') ? e.message : 'GROK_LOGIN_FAILED';
                        res.writeHead(400).end('Không kết nối được Grok. Xem trạng thái trong Windi.');
                    }
                    finally {
                        this.stopLogin();
                        onChange();
                    }
                })().catch(() => res.destroy());
            });
            await new Promise<void>((resolve, reject) => { server.once('error', () => reject(new Error('GROK_OAUTH_PORT_BUSY'))); server.listen(56121, '127.0.0.1', resolve); });
            this.server = server;
            this.error = null;
            this.loginTimer = setTimeout(() => { this.error = 'GROK_LOGIN_TIMEOUT'; this.stopLogin(); onChange(); }, 180000);
            this.loginTimer.unref();
            const u = new URL(endpoints.authorization_endpoint);
            u.search = new URLSearchParams({ response_type: 'code', client_id: CLIENT_ID, redirect_uri: REDIRECT, scope: 'openid profile email offline_access grok-cli:access api:access', code_challenge: challenge, code_challenge_method: 'S256', state, nonce, plan: 'generic', referrer: 'grokcli' }).toString();
            return { authorizationUrl: u.href, expiresIn: 180 };
        }
        finally {
            this.starting = false;
            onChange();
        }
    }
    async access(force = false): Promise<string> { if (!this.tokens)
        throw new Error('GROK_LOGIN_REQUIRED'); if (!force && this.tokens.expiresAt > Date.now() + 300000)
        return this.tokens.access; if (this.refreshing)
        return this.refreshing; const revision = this.revision, prior = this.tokens; this.refreshing = (async () => { try {
        const data = await this.exchange(prior.tokenEndpoint, { grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: prior.refresh });
        const next = this.normalize(data, prior.tokenEndpoint, prior);
        await this.save(next, revision);
        return next.access;
    }
    catch (e) {
        this.error = e instanceof Error && e.message.startsWith('GROK_') ? e.message : 'GROK_AUTH_NETWORK_ERROR';
        throw new Error(this.error);
    } })().finally(() => { this.refreshing = null; }); return this.refreshing; }
    async request(endpoint: string, body?: unknown, key?: string) { const url = xaiUrl(`https://api.x.ai/v1${endpoint}`); for (let attempt = 0; attempt < 2; attempt++) {
        const token = await this.access(attempt === 1);
        let r: Response;
        try {
            r = await this.fetcher(url, { method: body === undefined ? 'GET' : 'POST', redirect: 'error', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(key ? { 'x-idempotency-key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(300000) });
        }
        catch {
            throw new Error('GROK_NETWORK_RESULT_UNKNOWN');
        }
        if (r.status === 401 && attempt === 0)
            continue;
        return jsonResponse(r);
    } throw new Error('GROK_LOGIN_REQUIRED'); }
}
