import { NextResponse } from 'next/server';
import { getCatalog } from '@/lib/catalog-repository';
import {matchesPurpose,normalizeSearch,validPurpose} from '@/lib/creator-catalog';
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const catalog = await getCatalog();
  if (!catalog.available) return NextResponse.json({ data: [], error: 'Danh mục chưa kết nối được với database.' }, { status: 503 });
  const query = normalizeSearch((searchParams.get('q') || '').slice(0, 200));
  const purpose=searchParams.get('purpose');
  const data = catalog.resources.filter(row => matchesPurpose(row,validPurpose(purpose)?purpose:undefined)&&normalizeSearch([row.name,row.tagline,row.description,...row.tags].join(' ')).includes(query));
  return NextResponse.json({ data: data.slice(0, 30), total: data.length });
}
