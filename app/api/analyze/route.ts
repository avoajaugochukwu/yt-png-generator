import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import type { AnalyzeRequest, AnalyzeResponse } from '@/lib/types';

const SYSTEM_PROMPT = `You analyze video scripts to identify visual overlay opportunities for video editing.

Given a script (and optionally timestamped segments), identify:

1. "listicle-heading" — main section titles, numbered list items, key structural headers that would benefit from a prominent on-screen text overlay. These are typically headers like "Top 5 Benefits", "Step 1: Setup", etc.

2. "point-of-interest" — notable statistics, numbers, key phrases, product names, or important terms worth highlighting as smaller on-screen callouts.

Rules:
- Extract the exact text to display on the overlay (keep it concise — suitable for a PNG text block).
- If timestamped segments are provided, match each element to the closest segment's start/end times (in seconds).
- If no timestamps are available, set timestamp and timestampEnd to null.
- Generate a unique id for each element (use format "el-01", "el-02", etc.).
- Aim for 3-15 elements depending on script length. Don't over-extract.

Return JSON in this exact format:
{
  "elements": [
    {
      "id": "el-01",
      "type": "listicle-heading",
      "text": "The text for the overlay",
      "timestamp": 15.2,
      "timestampEnd": 18.5
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();

    if (!body.script?.trim()) {
      return Response.json({ error: 'Script text is required' }, { status: 400 });
    }

    let userMessage = `Here is the video script to analyze:\n\n${body.script}`;

    if (body.segments?.length) {
      userMessage += '\n\nTimestamped segments from audio transcription:\n';
      userMessage += JSON.stringify(body.segments, null, 2);
    }

    if (body.customInstructions?.trim()) {
      userMessage += `\n\nAdditional instructions from the user:\n${body.customInstructions}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content) as AnalyzeResponse;

    if (!Array.isArray(parsed.elements)) {
      return Response.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    return Response.json(parsed);
  } catch (error) {
    console.error('[/api/analyze]', error);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
