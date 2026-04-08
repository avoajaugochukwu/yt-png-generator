import { readHistory } from '@/lib/history';

export async function GET() {
  const history = await readHistory();
  return Response.json(history);
}
