// Compatibility endpoint for older Connect clients. Access is account-based.
export { GET } from '../access/route';
import { GET as access } from '../access/route';
export const runtime = 'nodejs';
export async function POST(request: Request) { return access(request); }
