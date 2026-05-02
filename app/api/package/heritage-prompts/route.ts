import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import { CHANNELS, getAiThumbnailSpec, type Channel } from '@/lib/channels';
import type { ScriptType, HeritagePromptResponse, HeritageCenterSubMode } from '@/lib/types';

interface RequestBody {
  channel: Channel;
  scriptType: ScriptType;
  /** The selected video title (used only as a topical anchor, not echoed). */
  videoTitle?: string;
  /** Free-form topic / script gist — what the video is about. */
  topic: string;
  /** Listicle item names extracted from the script — drives subject variety. */
  itemNames?: string[];
  /** Which center sub-mode to generate for. Defaults to channel's first. */
  centerSubMode?: HeritageCenterSubMode;
  /** Optional script text — given as fallback context if topic is sparse. */
  script?: string;
}

const VALID_SUB_MODES: HeritageCenterSubMode[] = ['object', 'job', 'food', 'tool', 'location', 'auto'];
const NON_AUTO_SUB_MODES: Exclude<HeritageCenterSubMode, 'auto'>[] = [
  'object',
  'job',
  'food',
  'tool',
  'location',
];

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    const channelConfig = CHANNELS[body.channel];
    if (!channelConfig) {
      return Response.json({ error: 'Unknown channel' }, { status: 400 });
    }
    if (channelConfig.imageMode !== 'ai') {
      return Response.json(
        { error: `Channel "${body.channel}" is not an AI-image channel.` },
        { status: 400 },
      );
    }

    const aiSpec = getAiThumbnailSpec(body.channel, body.scriptType);
    if (!aiSpec) {
      return Response.json(
        { error: `Channel "${body.channel}" has no AI thumbnail spec for "${body.scriptType}".` },
        { status: 400 },
      );
    }

    const requestedSubMode: HeritageCenterSubMode =
      body.centerSubMode &&
      VALID_SUB_MODES.includes(body.centerSubMode) &&
      aiSpec.centerSubModes.includes(body.centerSubMode)
        ? body.centerSubMode
        : aiSpec.centerSubModes[0];

    // For `auto`, the AI must pick from the channel's supported non-`auto` modes.
    const autoChoices = aiSpec.centerSubModes.filter(
      (m): m is Exclude<HeritageCenterSubMode, 'auto'> => m !== 'auto',
    );
    const isAuto = requestedSubMode === 'auto';

    const topic = (body.topic || '').trim() || (body.script || '').trim().slice(0, 1500);
    if (!topic) {
      return Response.json({ error: 'topic or script is required' }, { status: 400 });
    }

    const examplesBlock = aiSpec.examples
      .map(
        (ex, i) => `--- Example ${i + 1} ---
Title: "${ex.thumbnailTitle}"
Topic: ${ex.topic}
Center sub-mode: ${ex.centerSubMode}

center: "${ex.centerPrompt}"

leftFigure: "${ex.leftFigurePrompt}"

rightFigure: "${ex.rightFigurePrompt}"`,
      )
      .join('\n\n');

    const centerAnchorsBlock = autoChoices
      .map((mode) => {
        const anchor = aiSpec.styleAnchors.center[mode];
        return anchor ? `Center panel — sub-mode "${mode}":\n${anchor}` : null;
      })
      .filter(Boolean)
      .join('\n\n');

    const subModeTaskBlock = isAuto
      ? `2. centerSubMode — the user requested "auto". Study the topic and listicle items below and pick the SINGLE most clickbait-iconic center type from this list: ${autoChoices
          .map((m) => `"${m}"`)
          .join(', ')}. Output the chosen value (NOT "auto"). Pick:
   - "tool" when the listicle items are tools, instruments, or equipment.
   - "job" when the items are occupations, trades, or roles (faceless worker mid-action).
   - "food" when the items are foods, dishes, or meals.
   - "location" when the items are places, buildings, or sites.
   - "object" only as a catch-all if none of the above fit.
   You may not pick a value not in the list above.`
      : `2. centerSubMode — echo back: "${requestedSubMode}".`;

    const allowedSubModes = isAuto ? autoChoices : [requestedSubMode];

    const systemPrompt = `You are a thumbnail prompt engineer for the "${channelConfig.label}" YouTube channel.
Channel domain: ${channelConfig.voice.contentDomain}
Each thumbnail is a three-panel composition assembled from THREE INDEPENDENT image-gen prompts (one image-gen call per panel). They must visually unify but cannot be generated together.

=== STYLE ANCHORS (MUST hold across every prompt you write) ===

Overall:
${aiSpec.styleAnchors.overall}

Left figure panel:
${aiSpec.styleAnchors.leftFigure}

Right figure panel:
${aiSpec.styleAnchors.rightFigure}

${centerAnchorsBlock}

=== FEW-SHOT EXAMPLES (study the level of detail) ===

${examplesBlock}

=== TASK ===

Given a video title, topic, and listicle items, produce a JSON package with:

1. thumbnailTitle — 2-4 word ALL-CAPS hook for the thumbnail's top text bar (in this channel's voice). NOT a copy of the video title — a punchier thumbnail-only headline. Keep it short — these display very large.

${subModeTaskBlock}

3. prompts.center — a description (one short sentence) plus exactly 3 prompt variations.
   - Each variation is a complete photoreal image-gen prompt (Midjourney / DALL-E / Flux compatible).
   - Each variation features a DIFFERENT specific subject so the user can pick their favorite.
   - Honor the chosen sub-mode's style anchor strictly. Allowed sub-modes for the center: ${allowedSubModes
     .map((m) => `"${m}"`)
     .join(', ')}.
   - Length: 60-110 words per variation. Bake every needed style detail INTO the prompt — do not assume the model has memory of other prompts.

4. prompts.leftFigure — description + exactly 3 prompt variations. Each variation poses the figure with a DIFFERENT topical hand-prop. Each variation must produce a complete usable portrait on its own and obey the left-figure style anchor.

5. prompts.rightFigure — description + exactly 3 prompt variations. Different person from leftFigure. Different hand-prop than leftFigure but topically related. Obey the right-figure style anchor.

Hard rules:
- Both flanking figures honor the channel's flank palette anchor (sepia for Heritage, muted Kodachrome for 1950s — do NOT mix).
- Center for any "job"-style sub-mode must NOT show the worker's face.
- Every prompt must read as photoreal photography, not illustration / painting / 3D.
- Every prompt must anchor the era declared in the channel's style anchors. NEVER include items from a later era than the channel covers.
- Center subject must be SINGULAR — one hero artifact / one worker / one food item / one location. No collages.

=== OUTPUT FORMAT (strict JSON) ===
{
  "thumbnailTitle": "ALL CAPS HOOK",
  "centerSubMode": ${isAuto ? `<one of ${autoChoices.map((m) => `"${m}"`).join(' | ')}>` : `"${requestedSubMode}"`},
  "prompts": {
    "center":      { "description": "...", "variations": ["...", "...", "..."] },
    "leftFigure":  { "description": "...", "variations": ["...", "...", "..."] },
    "rightFigure": { "description": "...", "variations": ["...", "...", "..."] }
  }
}`;

    const userMessage = `Video title: ${body.videoTitle || '(none provided)'}
Topic: ${topic}
Center sub-mode requested: ${requestedSubMode}
${
  body.itemNames?.length
    ? `Listicle items (use these to inspire subject variety across variations):\n${body.itemNames
        .slice(0, 30)
        .map((n) => `- ${n}`)
        .join('\n')}`
    : ''
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content) as HeritagePromptResponse;

    if (
      typeof parsed.thumbnailTitle !== 'string' ||
      !parsed.prompts ||
      !parsed.prompts.center ||
      !parsed.prompts.leftFigure ||
      !parsed.prompts.rightFigure
    ) {
      return Response.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    parsed.thumbnailTitle = parsed.thumbnailTitle.trim().toUpperCase();
    // Coerce response into a concrete (non-auto) sub-mode that the channel actually supports.
    if (
      !VALID_SUB_MODES.includes(parsed.centerSubMode) ||
      parsed.centerSubMode === 'auto' ||
      !NON_AUTO_SUB_MODES.includes(parsed.centerSubMode as Exclude<HeritageCenterSubMode, 'auto'>) ||
      !autoChoices.includes(parsed.centerSubMode as Exclude<HeritageCenterSubMode, 'auto'>)
    ) {
      parsed.centerSubMode = isAuto ? autoChoices[0] : requestedSubMode;
    }

    for (const key of ['center', 'leftFigure', 'rightFigure'] as const) {
      const group = parsed.prompts[key];
      group.description = (group.description || '').trim();
      const variations = Array.isArray(group.variations) ? group.variations : [];
      group.variations = variations
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .slice(0, 3);
      while (group.variations.length < 3) group.variations.push('');
    }

    return Response.json(parsed);
  } catch (error) {
    console.error('[/api/package/heritage-prompts]', error);
    return Response.json({ error: 'Heritage prompt generation failed' }, { status: 500 });
  }
}
