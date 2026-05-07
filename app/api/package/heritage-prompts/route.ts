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
   - "job" when the items are occupations, trades, or roles (rendered per the channel's "job" anchor — read it carefully; some channels show a faceless worker, others show the iconic equipment of that occupation).
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
- Both flanking figures honor the channel's flank palette anchor — they must read as authentic SCANNED period-film photographs (visible film grain, paper-print texture, halation, gentle edge vignette, deep desaturated sepia with muddy-brown shadows and cream highlights, higher-than-modern contrast, weathered/lived-in subject with real skin texture and worn period-correct clothing). They must NOT look like a modern stock-photo subject with a sepia filter applied. Bake explicit grit cues (e.g. "Kodachrome / Tri-X-era film grain", "paper-print texture", "halation in highlights", "muddy-brown shadows", "weathered face", "faded/worn clothing", "reads as a scanned 1950s photograph, not a modern photo with a sepia filter") into every flank prompt — do not assume the model will infer them.
- Both flanking figures must FACE INWARD toward the center panel. Left figure's body and face turn slightly to camera-right (gaze landing just off-camera to the right, toward the inside edge of the panel). Right figure's body and face turn slightly to camera-left (gaze landing just off-camera to the left, toward the inside edge of the panel). They are NOT looking straight into the lens. State the inward-facing direction explicitly in every flank prompt. The lighting direction in each flank prompt should match the gaze direction (light from the inside edge so the lit side of the face is the side facing center).
- Center is a TIGHT EXTREME CLOSE-UP of a single hero subject that fills roughly 70-90% of the frame edge-to-edge, with dark blurred-out vignette edges (out-of-focus dim background that frames the hero). State both the close-up framing and the dark blurred-edge vignette explicitly in every center prompt.
- Center subjects must be the WEIRDEST / MOST VISUALLY ARRESTING period-correct option for the topic — strange shapes, exposed mechanisms, unusual coils/valves/gauges, glowing or dripping or smoking elements, period-specific oddness. Before writing each of the 3 center variations, brainstorm at least 5 candidate period-correct hero subjects and pick the most odd-looking, attention-grabbing one for that variation. Each variation must feature a DIFFERENT odd-looking subject.
- Center for any "job"-style sub-mode follows the channel's per-sub-mode "job" anchor — read it carefully. If the anchor specifies equipment-of-the-occupation (no people), the center is the iconic gear of that trade with NO people, NO hands, NO faces. If the anchor specifies a faceless worker, the worker's face must NOT show.
- Every prompt must read as photoreal photography, not illustration / painting / 3D.
- Every prompt must anchor the era declared in the channel's style anchors. NEVER include items from a later era than the channel covers.
- Center subject must be SINGULAR — one hero artifact / one piece of equipment / one food item / one location. No collages.

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
