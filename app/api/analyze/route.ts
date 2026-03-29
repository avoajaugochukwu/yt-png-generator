import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import type { AnalyzeRequest, AnalyzeResponse } from '@/lib/types';

const SYSTEM_PROMPT = `You analyze video scripts to identify visual overlay opportunities for video editing.

Scripts are often listicles (numbered lists like "10 Best Plants", "7 Tips for..."). Your job is to identify every item and create overlay assets.

Given a script, identify these element types:

1. "main-title" — The overall topic/title of the video, summarized into a short punchy phrase. This becomes a large centered rectangle. There should be exactly ONE main-title per script. Example: if the script is about "10 Luxury Plants You Need", the main-title text could be "10 LUXURY PLANTS".

2. "listicle-heading" — Each numbered item in the list. Format the text as "#N ITEM NAME" (e.g., "#1 CURRY LEAF TREE", "#2 BAY LAUREL", "#3 FINGER LIME"). Extract EVERY numbered item — listicles can have 20+ items, do NOT skip any. If the script has 15 items, output 15 listicle-heading elements.

3. "point-of-interest" — Notable facts, statistics, key phrases, or important terms worth highlighting as smaller callouts. These are supplementary — use them sparingly (1-3 per listicle item, only when genuinely notable).

Rules:
- For listicles: identify ALL numbered items, no matter how many. A "Top 20" list must have 20 listicle-heading elements.
- The main-title should be a concise summary (2-5 words) of the overall video topic.
- Listicle heading text should be short: "#N" followed by the item name (2-5 words max).
- Points of interest should be brief phrases (2-6 words).
- The main-title should always have timestamp 0 and timestampEnd 10 (it appears at the start of the video).
- No other element may have a timestamp that falls within 10 seconds of the main-title's timestampEnd. The earliest any other element can start is 20 seconds.
- All other elements should have timestamp and timestampEnd set to null.
- Generate a unique id for each element (use format "el-01", "el-02", etc.).
- Order elements chronologically as they appear in the script.

Return JSON in this exact format:
{
  "elements": [
    {
      "id": "el-01",
      "type": "main-title",
      "text": "10 LUXURY PLANTS",
      "timestamp": 0,
      "timestampEnd": 10
    },
    {
      "id": "el-02",
      "type": "listicle-heading",
      "text": "#1 CURRY LEAF TREE",
      "timestamp": null,
      "timestampEnd": null
    },
    {
      "id": "el-03",
      "type": "point-of-interest",
      "text": "Peak oil content at dawn",
      "timestamp": null,
      "timestampEnd": null
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
