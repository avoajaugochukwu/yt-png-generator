import type { GridTemplate, ScriptType, HeritageCenterSubMode } from './types';

export type Channel = 'garden' | 'heritage';

export type ImageSourceMode = 'deterministic' | 'ai';

export interface ThumbnailTextStyle {
  lineGap: number;
  topColor: string;
  bottomColor: string;
  barColor: string;
  topFont: string;
  bottomFont: string;
  /** Outline / stroke around both lines. Color + width measured at 1920×1080 canvas. */
  strokeColor: string;
  strokeWidth: number;
  /** Bottom line font-size multiplier vs the top line. 1 = same, 1.18 = ~18% bigger. */
  bottomSizeScale: number;
  /** Extra letter-spacing in px applied to the bottom line only. */
  bottomLetterSpacing: number;
  /** Hard-edged drop shadow — Canva's "Drop" effect with Blur 0. */
  shadowColor: string;
  /** Shadow displacement in px at 1920×1080. 0 disables the shadow. */
  shadowOffset: number;
  /** Shadow direction in degrees. Canvas convention: 0 = right, 45 = bottom-right, 90 = down. */
  shadowAngle: number;
}

export interface ThumbnailSpec {
  template: GridTemplate;
  gap: number;
  borderRadius: number;
  backgroundColor: string;
  imageCount: number;
  text: ThumbnailTextStyle;
}

export interface VoiceProfile {
  /** What the channel is about — used to seed SEO prompts. */
  contentDomain: string;
  /** Who's watching — informs title voice + word choice. */
  audience: string;
  /** Patterns that fit the channel — copy-this style. */
  signatureMoves: string[];
  /** Patterns to avoid — counter-examples for the LLM. */
  avoidPatterns: string[];
  /** Concrete sample titles in the channel's voice (for few-shot). */
  exampleTitles: string[];
}

/**
 * Few-shot example for the heritage prompt generator.
 * Each example translates a real-world thumbnail into the three
 * independent image-gen prompts that produced it.
 */
export interface HeritageExample {
  thumbnailTitle: string;
  topic: string;
  centerSubMode: HeritageCenterSubMode;
  centerPrompt: string;
  leftFigurePrompt: string;
  rightFigurePrompt: string;
}

export interface AiThumbnailSpec {
  /** Layout family — used by the prompt generator to pick a template. */
  layout: 'three-panel-heritage';
  /** Center sub-modes the channel supports. First entry is the default. */
  centerSubModes: HeritageCenterSubMode[];
  /** Style anchors the AI must keep stable across all generations. */
  styleAnchors: {
    overall: string;
    leftFigure: string;
    rightFigure: string;
    centerObject: string;
    centerJob: string;
    centerFood: string;
  };
  /** Few-shot examples baked into the prompt. */
  examples: HeritageExample[];
}

export interface ChannelConfig {
  id: Channel;
  label: string;
  imageMode: ImageSourceMode;
  supportedScriptTypes: ScriptType[];
  /** Deterministic compose specs (Garden-style cell grids). */
  thumbnail: Partial<Record<ScriptType, ThumbnailSpec>>;
  /** AI-image specs (Heritage-style prompt studio). */
  aiThumbnail?: Partial<Record<ScriptType, AiThumbnailSpec>>;
  voice: VoiceProfile;
}

const GARDEN_VOICE: VoiceProfile = {
  contentDomain:
    'Edible gardening, fruit trees, perennials, and resilient/heat-tolerant plants. Practical, plant-by-plant breakdowns for hobby and homestead growers.',
  audience:
    'Home gardeners and homesteaders aged 30-65 who want plants that actually work — heat tolerance, real yield, low maintenance. They scroll past glossy lifestyle content and click on specifics.',
  signatureMoves: [
    'Lead with a concrete physical detail (heat tolerance in °F, harvest weight, growth rate)',
    'Name the plant by its common name in the title when it is the hook',
    'Promise yield, ease, or surprise (most gardeners do not know X)',
    'Use numbers when honest — "5 plants", "115° heat", "20 lbs of fruit"',
    'Sound like a knowledgeable friend over the fence, not a brand',
  ],
  avoidPatterns: [
    'Generic lifestyle phrasing ("transform your garden", "garden goals")',
    'Overuse of "amazing", "incredible", "you won\'t believe"',
    'Vague benefit claims with no plant or number attached',
    'Clickbait that doesn\'t pay off the title in the first 30 seconds',
  ],
  exampleTitles: [
    '5 Fruit Trees That LOVE 115° Heat (Massive Harvests)',
    'I Stopped Growing Tomatoes — Here\'s What I Plant Instead',
    'The Cactus Fruit Nobody Talks About (Tastes Like Watermelon)',
    'Why Smart Gardeners Are Planting Elderberry This Year',
    '7 Plants That Beat Drought Without Even Trying',
  ],
};



const GARDEN_LISTICLE_THUMBNAIL: ThumbnailSpec = {
  template: { id: '3x1', label: '3 x 1', cols: 3, rows: 1 },
  gap: 10,
  borderRadius: 0,
  backgroundColor: '#9CA3AF',
  imageCount: 3,
  text: {
    lineGap: 6,
    topColor: '#FFFFFF',
    bottomColor: '#FFFC00',
    barColor: 'rgba(0, 0, 0, 0.7)',
    topFont: 'Open Sauce Sans',
    bottomFont: 'Anton',
    strokeColor: '#000000',
    strokeWidth: 6,
    bottomSizeScale: 1.18,
    bottomLetterSpacing: 6,
    shadowColor: '#000000',
    shadowOffset: 12,
    shadowAngle: 45,
  },
};

const HERITAGE_VOICE: VoiceProfile = {
  contentDomain:
    'Listicle videos about forgotten / lost / dying skills, crafts, jobs, and foods from the 1800s and early 1900s — homestead life, frontier knowledge, pre-industrial daily routines.',
  audience:
    'Americans 45-75 who romanticize self-reliance, traditional skills, and the pre-tech era. They click on "stuff your grandparents knew", forgotten survival craft, and old-time know-how.',
  signatureMoves: [
    'Open with FORGOTTEN, LOST, DYING, GONE, or BEFORE — the loss frame is the whole channel',
    'Reference an era anchor (1800s, before tech, your great-grandparents, pioneer)',
    'Use round numbers (25, 30, 50) to signal listicle scope',
    'Promise specificity — "skills", "tricks", "crafts", "jobs", "foods", not vague nouns',
    'Sound like a frontier history-keeper, not an academic',
  ],
  avoidPatterns: [
    'Modern lifestyle words ("hacks", "tips", "lifestyle", "wellness")',
    'Soft adjectives ("amazing", "beautiful", "wonderful")',
    'Anything that sounds post-1950 — the era is pre-industrial America',
    'Generic clickbait without an era hook',
  ],
  exampleTitles: [
    '30 DYING American Crafts Your Great-Grandparents Mastered',
    '25 FORGOTTEN Farm Skills Every American Knew 100 Years Ago',
    '25 Ways Americans Lived Without Relying on Technology',
    '30 Forgotten Skills Every American Used to Know',
    '25 LOST Appalachian Mountain Skills That Take a Lifetime to Learn',
  ],
};

const HERITAGE_LISTICLE_AI_THUMBNAIL: AiThumbnailSpec = {
  layout: 'three-panel-heritage',
  centerSubModes: ['object', 'job', 'food'],
  styleAnchors: {
    overall:
      'Photoreal 16:9 thumbnail composed of three independently generated panels. Left ~25%, center ~50%, right ~25%. Single horizontal frame. Rustic 1800s American homestead world. Each panel is a separate image-gen prompt — they must visually unify (same era, same warm lighting feel) without being identical clones.',
    leftFigure:
      '19th-century American (1800s frontier era), 50-70 years old, weathered. Period-correct clothing (denim work overalls, linen shirt, suspenders, work boots). SEPIA / desaturated warm-tone palette. Direct gaze toward camera. Seated on a wood crate or stump, or standing inside a rustic wooden cabin. Holding/posed with a tool or object thematically tied to the topic. Plain warm-neutral background that blends with rustic wood. Soft natural side light.',
    rightFigure:
      'Same era and SEPIA palette as left figure but a DIFFERENT person — usually a 1800s American woman, 50-65, hair in a bun, in a long apron over a work dress; or a different older man. Direct gaze toward camera. Holding a different object than the left figure but topically related. Plain warm-neutral background that blends with rustic wood.',
    centerObject:
      'ONE old-timey object as the hero — a single artifact from before 1920 (cast-iron cauldron, copper still, hand-cranked apparatus, blacksmith tongs, butter churn, oil lamp, etc.). NOT sepia — keeps modern realistic colors so it pops against the muted flanks. Dramatic single-source warm lighting. Centered hero shot, exaggerated detail, sharp focus. Set in a rustic wooden environment (wood plank wall, fireplace, cabin interior). NO people in frame.',
    centerJob:
      'A faceless 1800s worker mid-action — face NOT showing (cropped above shoulders or turned away). Hands and tools featured. Old-timey occupation (blacksmith striking iron, cooper hooping a barrel, tinker mending pots, butcher hanging cured meat, butter-churner, wheelwright, etc.). NOT sepia — modern realistic colors so the action pops. Dramatic warm lighting. Rustic wooden setting. Sharp focus on hands and tool.',
    centerFood:
      'A hero food shot of pre-industrial American homestead food — fresh-baked sourdough on a wooden board, hanging cured meat, a churn-fresh butter mold on burlap, jars of preserved peaches, a black iron skillet of cornbread, etc. NOT sepia — rich modern realistic food colors. Dramatic single-source warm lighting from above or the side. Rustic wooden table or plank backdrop. NO people in frame.',
  },
  examples: [
    {
      thumbnailTitle: 'FORGOTTEN FARM TRICKS',
      topic: '1800s American farm-and-homestead skills (hand-crank apparatus, lye soap, mason-jar preservation)',
      centerSubMode: 'object',
      centerPrompt:
        'Photoreal 16:9 hero shot of a polished copper cauldron half-full of bubbling liquid, suspended from a wooden hand-cranked gear apparatus made of dark oak with cast-iron gears, sitting over open flames on stacked logs. Set against a rustic horizontal wood-plank wall, warm dark tones. Dramatic warm firelight from below catching the copper rim and the gear teeth. Modern realistic colors — copper warmth, orange flames, dark aged wood. Photorealistic, sharp focus on the cauldron and apparatus. No people in frame. Cinematic 1800s homestead atmosphere.',
      leftFigurePrompt:
        'Photoreal portrait of a 60-year-old American farmer from the 1800s, weathered face, short cropped grey hair, clean-shaven. Wearing dark blue denim work overalls over a beige long-sleeve work shirt. Seated on a small rough wooden crate, body angled three-quarters to camera-right. Right hand reaching out to camera-right and gripping a wooden hand-crank handle with iron fitting. Calm direct gaze toward camera. SEPIA / desaturated warm-tone palette. Soft natural side light. Plain warm-neutral background that blends with rustic wood plank wall. Photorealistic, sharp facial detail.',
      rightFigurePrompt:
        'Photoreal portrait of a 55-year-old 1800s American homestead woman, brown hair pulled back into a low bun, slight wrinkles, calm steady gaze toward camera. Wearing a brown polka-dot long-sleeve work dress with a cream-colored apron. Standing facing camera, holding up a hand-cut bar of cream-colored homemade lye soap in her right hand at chest height, and a clear glass Ball mason jar in her left hand. SEPIA / desaturated warm-tone palette. Soft natural light. Plain warm-neutral background that blends with rustic wood plank wall. Photorealistic.',
    },
    {
      thumbnailTitle: 'LOST MOUNTAIN SKILLS',
      topic: 'Appalachian mountain homesteading (rendering fat, splitting wood, foraging herbs, wood-press preservation)',
      centerSubMode: 'object',
      centerPrompt:
        'Photoreal 16:9 hero shot of a black cast-iron cauldron hanging from an iron hook, full of bubbling golden-amber rendered fat, suspended over crackling log flames. Behind it, a tall vintage wooden screw-press with iron gear-wheel, made of aged oak. Set in a rustic timber cabin interior, weathered wood beams. Dramatic warm fire glow from below — orange flames, golden liquid, deep amber wood. Modern realistic colors. Photorealistic, sharp focus on the cauldron and press. No people in frame.',
      leftFigurePrompt:
        'Photoreal portrait of a 65-year-old Appalachian mountain man, full grey-and-brown beard, weathered tanned face. Wearing a faded off-white linen long-sleeve work shirt and dark denim work pants with suspenders. Seated on a wide wood stump, body angled to camera-right. Holding a heavy iron meat cleaver in his right hand resting on a split log of pale wood balanced on his knee. Calm direct gaze toward camera. SEPIA / desaturated warm-tone palette. Soft window light from the left. Plain warm-neutral rustic-cabin background. Photorealistic.',
      rightFigurePrompt:
        'Photoreal portrait of a 60-year-old Appalachian woman, grey hair pulled back, gentle direct gaze toward camera. Wearing a long brown work dress with a cream apron over it. Standing facing camera, holding a woven wicker basket full of dried foraged herbs and small twigs against her waist with both hands. SEPIA / desaturated warm-tone palette. Soft natural daylight from the right. Plain warm-neutral rustic-cabin background. Photorealistic.',
    },
  ],
};

export const CHANNELS: Record<Channel, ChannelConfig> = {
  garden: {
    id: 'garden',
    label: 'Garden',
    imageMode: 'deterministic',
    supportedScriptTypes: ['listicle', 'essay'],
    thumbnail: {
      listicle: GARDEN_LISTICLE_THUMBNAIL,
    },
    voice: GARDEN_VOICE,
  },
  heritage: {
    id: 'heritage',
    label: 'Heritage',
    imageMode: 'ai',
    supportedScriptTypes: ['listicle'],
    thumbnail: {},
    aiThumbnail: {
      listicle: HERITAGE_LISTICLE_AI_THUMBNAIL,
    },
    voice: HERITAGE_VOICE,
  },
};

export function getThumbnailSpec(channel: Channel, scriptType: ScriptType): ThumbnailSpec | null {
  return CHANNELS[channel]?.thumbnail[scriptType] ?? null;
}

export function getAiThumbnailSpec(channel: Channel, scriptType: ScriptType): AiThumbnailSpec | null {
  return CHANNELS[channel]?.aiThumbnail?.[scriptType] ?? null;
}

export function hasThumbnailSupport(channel: Channel, scriptType: ScriptType): boolean {
  const cfg = CHANNELS[channel];
  if (!cfg) return false;
  return !!cfg.thumbnail[scriptType] || !!cfg.aiThumbnail?.[scriptType];
}
