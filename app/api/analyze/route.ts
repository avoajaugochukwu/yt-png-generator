import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import type { AnalyzeRequest, AnalyzeResponse, ScriptType } from '@/lib/types';

const VALID_SCRIPT_TYPES: ReadonlySet<ScriptType> = new Set([
  'listicle',
  'tutorial',
  'explainer',
  'essay',
  'narrative',
  'commentary',
  'other',
]);

const SYSTEM_PROMPT = `You analyze video scripts to identify visual overlay opportunities for video editing.

STEP 1 — CLASSIFY THE SCRIPT

First, classify the script into exactly one of these types and include it as "scriptType" in the response:

- "listicle" — A numbered or enumerated list of items ("10 Best Plants", "7 Tips for…", "Top 5 Cameras"). Items are clearly separable and usually introduced with numbers or ordinals.
- "tutorial" — A step-by-step how-to. The viewer is being walked through a procedure (setup, installation, cooking, a craft).
- "explainer" — A conceptual breakdown of a topic or mechanism ("How X works", "Why Y happens"). Less procedural than a tutorial, more informational.
- "essay" — An argumentative or thematic video essay with a thesis, supporting points, and (often) a conclusion. Common in cultural/critical content.
- "narrative" — A story. A sequence of events with characters, setting, and turning points. Often first-person or documentary-style.
- "commentary" — Reaction, opinion, or hot-take content. Loose structure, heavy on the speaker's voice.
- "other" — Anything that doesn't clearly fit above.

If the script genuinely mixes types, pick the one that best describes the overall structure.

STEP 2 — EMIT ELEMENTS (by type)

Element types:

1. "main-title" — The overall topic/title of the video as a short punchy phrase. EXACTLY ONE per script, for every scriptType. Example: for a video titled "10 Luxury Plants You Need", main-title text could be "10 LUXURY PLANTS".

2. "listicle-heading" — Each numbered item in a listicle. Format as "#N ITEM NAME" (e.g., "#1 CURRY LEAF TREE"). ONLY emit these when scriptType is "listicle". For every other type, do NOT emit any listicle-heading elements.

3. "point-of-interest" — A short callout for notable facts, stats, key terms, pull-quotes, or important phrases. Usable for every scriptType. This is the workhorse element for non-listicle scripts.

4. "subscribe" — Emit whenever the script mentions "subscribe", "subscribing", "hit subscribe", or asks viewers to subscribe in any form. Text is always the literal word "SUBSCRIBE". Multiple allowed if the script CTAs at different points.

PER-TYPE RULES

- listicle:
  - Emit main-title + EVERY numbered item as a listicle-heading. Do NOT skip any. A "Top 20" list has exactly 20 headings.
  - Use POIs sparingly: 1-3 per listicle item, only when genuinely notable.
- tutorial:
  - Emit main-title + POIs for key steps, tools, warnings, measurements, or gotchas.
  - Do NOT emit listicle-heading.
- explainer:
  - Emit main-title + POIs for definitions, stats, mechanisms, or named concepts.
- essay:
  - Emit main-title + POIs for the thesis, key claims, pull-quotes, and supporting stats. Be generous with POIs on thesis/claim statements — those are the visual anchors.
- narrative:
  - Emit main-title + sparse POIs for names, places, dates, and turning points. Keep the POI count low — let the story breathe.
- commentary:
  - Emit main-title + POIs for hot takes, quotable lines, and named subjects.
- other:
  - Emit main-title + POIs where any phrase is genuinely worth highlighting on-screen.

GENERAL RULES (all types)

- main-title should be a concise summary (2-5 words) of the overall video topic.
- listicle headings: "#N" followed by the item name (2-5 words max).
- Points of interest: brief phrases (2-6 words).
- If timestamped segments are provided, match each element to the closest segment's start/end times (in seconds).
- main-title ALWAYS has a timestamp: set it to 5, with timestampEnd around 8 seconds (or just before the first other timestamped element, whichever is smaller). Applies for every scriptType, even when no segments are provided.
- For all other element types, if no timestamps are available, set timestamp and timestampEnd to null.
- Generate a unique id for each element ("el-01", "el-02", …).
- Order elements chronologically as they appear in the script.
- Enforce a minimum 4-second gap between any two consecutive elements that have timestamps. If the script places them closer together, push the later element's timestamp forward so the gap is at least 4 seconds — but never push a POI past the next listicle-heading's timestamp. A heading and its first POI must NEVER share the same timestamp.

Also generate a short "suggestedTitle" (3-8 words) that summarizes the video topic — human-readable, used as a session label.

Return JSON in this exact format:
{
  "scriptType": "listicle",
  "suggestedTitle": "10 Luxury Plants You Need",
  "elements": [
    {
      "id": "el-01",
      "type": "main-title",
      "text": "10 LUXURY PLANTS",
      "timestamp": 5,
      "timestampEnd": 8
    },
    {
      "id": "el-02",
      "type": "listicle-heading",
      "text": "#1 CURRY LEAF TREE",
      "timestamp": 15.2,
      "timestampEnd": 18.5
    },
    {
      "id": "el-03",
      "type": "point-of-interest",
      "text": "Peak oil content at dawn",
      "timestamp": 22.0,
      "timestampEnd": 24.5
    },
    {
      "id": "el-04",
      "type": "subscribe",
      "text": "SUBSCRIBE",
      "timestamp": 45.0,
      "timestampEnd": 48.0
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

    const scriptType: ScriptType = VALID_SCRIPT_TYPES.has(parsed.scriptType)
      ? parsed.scriptType
      : 'other';
    parsed.scriptType = scriptType;

    // Non-listicle scripts must not contain listicle-heading elements, even if the model slipped up.
    if (scriptType !== 'listicle') {
      parsed.elements = parsed.elements.filter((el) => el.type !== 'listicle-heading');
    }

    // main-title is always anchored at 5s so it comes in early.
    const MAIN_TITLE_START = 5;
    const firstTimestamped = parsed.elements.find(
      (e) => e.type !== 'main-title' && typeof e.timestamp === 'number',
    );
    for (const el of parsed.elements) {
      if (el.type !== 'main-title') continue;
      el.timestamp = MAIN_TITLE_START;
      const nextStart = typeof firstTimestamped?.timestamp === 'number' ? firstTimestamped.timestamp : Infinity;
      const desiredEnd = Math.min(el.timestamp + 3, nextStart - 0.1);
      el.timestampEnd = Math.max(el.timestamp + 0.1, desiredEnd);
    }

    // Enforce minimum 4s gap between consecutive timestamped elements.
    // Headings anchor the timeline — never push a POI past the next heading.
    const MIN_GAP = 4;
    const nextHeadingAt: (number | null)[] = parsed.elements.map(() => null);
    let upcoming: number | null = null;
    for (let i = parsed.elements.length - 1; i >= 0; i--) {
      nextHeadingAt[i] = upcoming;
      const el = parsed.elements[i];
      if (el.type === 'listicle-heading' && typeof el.timestamp === 'number') {
        upcoming = el.timestamp;
      }
    }
    let prev: number | null = null;
    for (let i = 0; i < parsed.elements.length; i++) {
      const el = parsed.elements[i];
      if (typeof el.timestamp !== 'number') continue;
      if (el.type === 'main-title') continue;
      if (prev !== null && el.timestamp - prev < MIN_GAP) {
        const desired = prev + MIN_GAP;
        const ceiling = el.type === 'point-of-interest' && nextHeadingAt[i] !== null
          ? nextHeadingAt[i]! - 0.1
          : Infinity;
        el.timestamp = Math.min(desired, ceiling);
        if (typeof el.timestampEnd === 'number' && el.timestampEnd < el.timestamp) {
          el.timestampEnd = el.timestamp + 2;
        }
      }
      prev = el.timestamp;
    }

    return Response.json(parsed);
  } catch (error) {
    console.error('[/api/analyze]', error);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
