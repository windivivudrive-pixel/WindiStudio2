import { writer } from '@/lib/voice/server';
import { geminiCatalog, geminiIdentity, geminiFailure, geminiOrderColumns, privateHeaders } from '@/lib/gemini/server';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const [catalog, user] = await Promise.all([geminiCatalog(), geminiIdentity(undefined, true)]);
    let orders = [];
    if (user) {
      const result = await writer().from('windi_gemini_orders').select(geminiOrderColumns).eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
      if (result.error) throw result.error;
      orders = result.data || [];
    }
    return Response.json({ ...catalog, authenticated: !!user, orders }, { headers: privateHeaders });
  } catch (error) { return geminiFailure(error); }
}
