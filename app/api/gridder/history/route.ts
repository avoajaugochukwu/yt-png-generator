import { readHistory } from '@/lib/history';

export async function GET() {
  console.log('[GET /api/gridder/history] called');
  try {
    const history = await readHistory();
    console.log(`[GET /api/gridder/history] returning ${history.length} entries`);
    return Response.json(history);
  } catch (err) {
    console.error('[GET /api/gridder/history] error:', err);
    return Response.json([], { status: 200 });
  }
}
