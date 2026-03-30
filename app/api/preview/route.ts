import { NextRequest } from 'next/server';
import { generatePng } from '@/lib/canvas';
import type { VisualElement, CustomizationOptions } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: { element: VisualElement; customization: CustomizationOptions } =
      await request.json();

    const { buffer } = generatePng(body.element, body.customization);
    const base64 = Buffer.from(buffer).toString('base64');

    return Response.json({ png: base64 });
  } catch (error) {
    console.error('[/api/preview]', error);
    return Response.json({ error: 'Preview failed' }, { status: 500 });
  }
}
