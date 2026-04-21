import { NextRequest } from 'next/server';
import openai from '@/lib/openai';
import { CHANNELS, getThumbnailSpec, type Channel } from '@/lib/channels';
import type { ScriptType, PackageSeoResponse } from '@/lib/types';

interface RequestBody {
  channel: Channel;
  scriptType: ScriptType;
  script: string;
  /** Pre-extracted item names from listicle headings (preferred when available). */
  itemNames?: string[];
}

const CTR_PRINCIPLES = `1. LOSS AVERSION — People would rather avoid losing than gain. Frame around avoiding pain or loss.
   Example: "10 Things I'm NOT Buying in 2022 | Minimalism & Saving Money"

2. CAR CRASH EFFECT — Drama makes people stop scrolling and click.
   Example: "This 'Adult Only' Cruise Was The Worst Cruise I've Ever Taken"

3. SHINY OBJECT SYNDROME — A new opportunity presents hope. People get excited about something new.
   Example: "10K Followers in 10 Days (MY NEW STRATEGY!)"

4. AUTHORITY BIAS — We trust recognized names. Borrow credibility by referencing experts or well-known figures.
   Example: "Jordan Peterson's Warning To The World"

5. FOMO (FEAR OF MISSING OUT) — Make viewers feel others know something they don't.
   Example: "7 Things Plant Experts Do That You Probably Don't"

6. CONTRAST PRINCIPLE — Pair opposite ideas together to spark curiosity.
   Example: "20 Greatest Discontinued Foods of All Time"

7. WARNINGS PRINCIPLE — Use urgency or protective framing.
   Example: "iOS 15 Settings You Need To Turn Off Now"

8. CONFIRMATION BIAS — Suggest your video confirms what they already suspect.
   Example: "You Were PROGRAMMED to Be Poor"

9. REGRET AVERSION — Frame content around mistakes people can avoid.
   Example: "6 BIG Purchases Retirees (Almost) Always Regret!"

10. CURIOSITY GAP — Open a gap between what they know and what they want to know.
    Example: "Start Doing This And Never Be Poor or Broke Again"`;

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    const channelConfig = CHANNELS[body.channel];
    if (!channelConfig) {
      return Response.json({ error: 'Unknown channel' }, { status: 400 });
    }

    const spec = getThumbnailSpec(body.channel, body.scriptType);
    if (!spec) {
      return Response.json(
        { error: `Channel "${body.channel}" does not yet support scriptType "${body.scriptType}".` },
        { status: 400 },
      );
    }

    if (!body.script?.trim()) {
      return Response.json({ error: 'Script text is required' }, { status: 400 });
    }

    const voice = channelConfig.voice;

    const systemPrompt = `You are a YouTube SEO expert specializing in CTR optimization for the "${channelConfig.label}" channel.

=== CHANNEL VOICE ===
Domain: ${voice.contentDomain}
Audience: ${voice.audience}

Signature moves (DO copy this style):
${voice.signatureMoves.map((m) => `- ${m}`).join('\n')}

Avoid these patterns:
${voice.avoidPatterns.map((m) => `- ${m}`).join('\n')}

Reference titles in this channel's voice:
${voice.exampleTitles.map((t) => `- ${t}`).join('\n')}

=== TITLE GENERATION FRAMEWORK: 10 PSYCHOLOGICAL HACKS FOR CTR ===
${CTR_PRINCIPLES}

=== TASK ===
Given a video script, produce TWO things:

A) imageKeywords — the top ${spec.imageCount} concrete subject names to feature as photos in the thumbnail. Each name should be a real-world thing you can search Google Images for (Title Case, no adjectives or articles, no quotes). Ordered by visual impact. Return exactly ${spec.imageCount}.

A2) allKeywords — an exhaustive list of 15-25 searchable subjects found in the script (plants, tools, places, techniques, concepts, named items). Same formatting rules as imageKeywords. These give the user alternative image options to drop into any cell. Order by how prominently they feature in the script. The first ${spec.imageCount} may overlap with imageKeywords — that's fine.

B) titles — exactly 5 title options, each using a DIFFERENT psychological principle from the framework. For each title:
   - title: under 70 characters, in the channel's voice. Make it feel natural — never formulaic.
   - principle: the name of the principle used (e.g., "Curiosity Gap").
   - principleNumber: 1-10 matching the framework.
   - estimatedCTR: "high" or "medium" based on how strong the hook is.
   - primaryText: 2-5 word UPPERCASE bold hook for the thumbnail. NOT a copy of the title — a different angle that complements it.
   - secondaryText: 2-5 word UPPERCASE supporting line for the thumbnail. Adds specificity / payoff.

Rank titles by predicted CTR (best first). Each title's primaryText + secondaryText should pair into a complete thumbnail-text (top hook + bottom payoff), like "THEY LOVE 115° HEAT" / "MASSIVE FRUIT HARVEST!".

4. TAGS: 15-20 relevant YouTube tags for SEO.
   - Mix of broad and specific tags
   - Include topic keywords, related topics, and long-tail variations

=== OUTPUT FORMAT (JSON) ===
{
  "imageKeywords": ["Subject One", "Subject Two", ...],
  "allKeywords": ["Subject One", "Subject Two", "Subject Three", "..."],
  "titles": [
    {
      "title": "...",
      "principle": "Curiosity Gap",
      "principleNumber": 10,
      "estimatedCTR": "high",
      "primaryText": "BOLD HOOK",
      "secondaryText": "PAYOFF LINE"
    }
  ],
  "tags": ["fruit trees", "heat tolerant plants", "..."]
}`;

    let userMessage = `Channel: ${channelConfig.label}\nScript type: ${body.scriptType}\nThumbnail layout: ${spec.template.cols}x${spec.template.rows}, ${spec.imageCount} image slots\n\nScript:\n${body.script}`;

    if (body.itemNames?.length) {
      userMessage += `\n\nListicle items already extracted (use these to inform image keywords and titles):\n${body.itemNames.join('\n')}`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content) as PackageSeoResponse;

    if (!Array.isArray(parsed.imageKeywords) || !Array.isArray(parsed.titles)) {
      return Response.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    parsed.imageKeywords = parsed.imageKeywords.slice(0, spec.imageCount);
    while (parsed.imageKeywords.length < spec.imageCount) {
      parsed.imageKeywords.push('');
    }

    const seenKeywords = new Set<string>();
    parsed.allKeywords = (Array.isArray(parsed.allKeywords) ? parsed.allKeywords : [])
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter((k) => {
        if (!k) return false;
        const lower = k.toLowerCase();
        if (seenKeywords.has(lower)) return false;
        seenKeywords.add(lower);
        return true;
      })
      .slice(0, 30);

    // Ensure imageKeywords are represented at the front of allKeywords so the user
    // can always fall back to whatever seeded the cells.
    for (const kw of parsed.imageKeywords.slice().reverse()) {
      if (!kw) continue;
      const lower = kw.toLowerCase();
      const existingIdx = parsed.allKeywords.findIndex((k) => k.toLowerCase() === lower);
      if (existingIdx > 0) {
        parsed.allKeywords.splice(existingIdx, 1);
        parsed.allKeywords.unshift(kw);
      } else if (existingIdx === -1) {
        parsed.allKeywords.unshift(kw);
      }
    }

    parsed.titles = parsed.titles.slice(0, 5).map((t) => ({
      ...t,
      primaryText: (t.primaryText || '').toUpperCase(),
      secondaryText: (t.secondaryText || '').toUpperCase(),
      estimatedCTR: t.estimatedCTR === 'high' ? 'high' : 'medium',
    }));

    if (!Array.isArray(parsed.tags)) parsed.tags = [];

    return Response.json(parsed);
  } catch (error) {
    console.error('[/api/package/seo]', error);
    return Response.json({ error: 'SEO generation failed' }, { status: 500 });
  }
}
