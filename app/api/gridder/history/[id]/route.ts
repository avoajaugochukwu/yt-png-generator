import { NextRequest } from 'next/server';
import { readHistoryEntry } from '@/lib/history';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await readHistoryEntry(id);
  if (!entry) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json(entry);
}
