import { NextRequest } from 'next/server';
import { generatePng } from '@/lib/canvas';
import { createZip } from '@/lib/zip';
import type { GenerateRequest, TimelineEntry } from '@/lib/types';

function formatTimestamp(seconds: number | undefined | null): string | null {
  if (seconds == null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.elements?.length) {
      return Response.json({ error: 'No elements to generate' }, { status: 400 });
    }

    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (!hexRegex.test(body.customization.textColor) || !hexRegex.test(body.customization.backgroundColor)) {
      return Response.json({ error: 'Invalid hex color format' }, { status: 400 });
    }

    const files: Array<{ name: string; buffer: Buffer }> = [];
    const timelineEntries: TimelineEntry[] = [];

    for (let i = 0; i < body.elements.length; i++) {
      const element = body.elements[i];
      const slug = element.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      const filename = `${String(i + 1).padStart(2, '0')}-${slug}.png`;

      const { buffer, width, height } = generatePng(element, body.customization);

      files.push({ name: filename, buffer });

      timelineEntries.push({
        filename,
        text: element.text,
        type: element.type,
        start_time: formatTimestamp(element.timestamp),
        end_time: formatTimestamp(element.timestampEnd),
        width,
        height,
      });
    }

    const zipBuffer = await createZip(files);

    return Response.json({
      timeline: timelineEntries,
      zip: Buffer.from(zipBuffer).toString('base64'),
    });
  } catch (error) {
    console.error('[/api/generate]', error);
    return Response.json({ error: 'Generation failed' }, { status: 500 });
  }
}
