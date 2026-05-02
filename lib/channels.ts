import type { GridTemplate, ScriptType, HeritageCenterSubMode } from './types';

export type Channel = 'garden' | 'heritage' | 's1950s';

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
  layout: 'three-panel';
  /** Center sub-modes the channel supports. First entry is the default. Include `'auto'` to let the AI pick. */
  centerSubModes: HeritageCenterSubMode[];
  /** Style anchors the AI must keep stable across all generations. */
  styleAnchors: {
    overall: string;
    leftFigure: string;
    rightFigure: string;
    /** Per-sub-mode center anchor. Must include an entry for every non-`auto` mode in `centerSubModes`. */
    center: Partial<Record<Exclude<HeritageCenterSubMode, 'auto'>, string>>;
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
  layout: 'three-panel',
  centerSubModes: ['auto', 'object', 'job', 'food'],
  styleAnchors: {
    overall:
      'Photoreal 16:9 thumbnail composed of three independently generated panels. Left ~25%, center ~50%, right ~25%. Single horizontal frame. Rustic 1800s American homestead world. Each panel is a separate image-gen prompt — they must visually unify (same era, same warm lighting feel) without being identical clones.',
    leftFigure:
      '19th-century American (1800s frontier era), 50-70 years old, weathered. Period-correct clothing (denim work overalls, linen shirt, suspenders, work boots). SEPIA / desaturated warm-tone palette. Direct gaze toward camera. Seated on a wood crate or stump, or standing inside a rustic wooden cabin. Holding/posed with a tool or object thematically tied to the topic. Plain warm-neutral background that blends with rustic wood. Soft natural side light.',
    rightFigure:
      'Same era and SEPIA palette as left figure but a DIFFERENT person — usually a 1800s American woman, 50-65, hair in a bun, in a long apron over a work dress; or a different older man. Direct gaze toward camera. Holding a different object than the left figure but topically related. Plain warm-neutral background that blends with rustic wood.',
    center: {
      object:
        'ONE old-timey object as the hero — a single artifact from before 1920 (cast-iron cauldron, copper still, hand-cranked apparatus, blacksmith tongs, butter churn, oil lamp, etc.). NOT sepia — keeps modern realistic colors so it pops against the muted flanks. Dramatic single-source warm lighting. Centered hero shot, exaggerated detail, sharp focus. Set in a rustic wooden environment (wood plank wall, fireplace, cabin interior). NO people in frame.',
      job:
        'A faceless 1800s worker mid-action — face NOT showing (cropped above shoulders or turned away). Hands and tools featured. Old-timey occupation (blacksmith striking iron, cooper hooping a barrel, tinker mending pots, butcher hanging cured meat, butter-churner, wheelwright, etc.). NOT sepia — modern realistic colors so the action pops. Dramatic warm lighting. Rustic wooden setting. Sharp focus on hands and tool.',
      food:
        'A hero food shot of pre-industrial American homestead food — fresh-baked sourdough on a wooden board, hanging cured meat, a churn-fresh butter mold on burlap, jars of preserved peaches, a black iron skillet of cornbread, etc. NOT sepia — rich modern realistic food colors. Dramatic single-source warm lighting from above or the side. Rustic wooden table or plank backdrop. NO people in frame.',
    },
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

const S1950S_VOICE: VoiceProfile = {
  contentDomain:
    'Postwar American life and labor (roughly 1940-1985) — dangerous trades, vanished tools, factory floors, suburban routines, vintage foods, mid-century occupations and locations. Specific worker names, dollar amounts, plant towns, and OSHA-era turning points are the texture.',
  audience:
    'Americans 50-80 with parents/grandparents who worked the postwar boom — steel, textiles, auto, refineries, asbestos, lead, uranium. They click on JOBS THAT KILLED, FORGOTTEN TOOLS, FOODS YOUR DAD ATE, and WORKING-CLASS NOSTALGIA framed against the bill-coming-due narrative.',
  signatureMoves: [
    'Anchor the decade explicitly (1950s, postwar, pre-OSHA, before EPA, mid-century)',
    'Use the body-cost frame ("THAT KILLED", "BEFORE 50", "TRADED LUNGS", "FORGOTTEN")',
    'Round-number listicle scope (10, 15, 25, 30)',
    'Lean on specificity that signals research (city + plant + year)',
    'Sound like a working-class historian, not a documentary narrator',
  ],
  avoidPatterns: [
    'Frontier / pioneer / 1800s vocabulary — that\'s the Heritage channel\'s lane',
    'Soft adjectives ("amazing", "heartwarming", "incredible")',
    'Modern wellness or self-help framing',
    'Fluffy nostalgia without the labor / cost angle',
  ],
  exampleTitles: [
    '25 Jobs From the 1950s That Killed Fathers Before They Hit 50',
    '15 Forgotten Tools Every 1950s Garage Had',
    '20 Pre-OSHA Trades That Disappeared by 1980',
    '25 Foods Your Postwar Dad Ate That Are Gone Now',
    '10 Mid-Century Factory Floors America Forgot',
  ],
};

const S1950S_LISTICLE_AI_THUMBNAIL: AiThumbnailSpec = {
  layout: 'three-panel',
  centerSubModes: ['auto', 'tool', 'job', 'food', 'object', 'location'],
  styleAnchors: {
    overall:
      'Photoreal 16:9 thumbnail composed of three independently generated panels. Left ~25%, center ~50%, right ~25%. Single horizontal frame. Postwar American world (1940-1985) — steel mills, refineries, sawmills, foundries, auto plants, suburban kitchens, factory floors. Each panel is a separate image-gen prompt — they unify by era and lighting feel without being clones.',
    leftFigure:
      'A working-class American man, 35-55, mid-century era (1945-1975). Period-correct clothing — soot-streaked denim work shirt with rolled sleeves, dark work pants, worn leather work boots; or a hard hat + safety glasses + canvas welding apron. Weathered face, slight stubble, calloused hands. MUTED desaturated mid-century color palette — washed-out Kodachrome look, NOT sepia. Direct steady gaze toward camera. Set against a plain warm-neutral industrial backdrop (concrete wall, sheet metal, factory shop floor blur). Holding a tool or workplace artifact relevant to the topic. Soft cool overhead light with a warm fill — like a 1950s factory-floor photograph.',
    rightFigure:
      'A 1950s working-class American woman, 30-55 — usually a wife / housewife / widow figure. Period-correct clothing — a 1950s housedress with apron, or a Sunday-best blouse and skirt; hair pin-curled, set, or in a kerchief. Tired but composed expression, direct gaze toward camera. MUTED desaturated mid-century color palette to match the left figure (NOT sepia). Holding an object thematically linked to the topic but DIFFERENT from the left figure (a folded company letter, a Bakelite radio, a pyrex casserole, a framed work photo of her husband). Plain warm-neutral domestic backdrop (faded floral wallpaper, kitchen tile, formica counter blur). Soft natural window light.',
    center: {
      tool:
        'ONE iconic mid-century industrial or domestic tool / instrument as the hero — a single 1950s artifact (asbestos hopper spray gun, hex-chrome plating rack, lead-paint mixing mill, copper rivet hammer, vintage Geiger counter, oxy-acetylene torch, Pyrex casserole dish, hand-crank meat grinder, etc.). NOT desaturated — keeps modern realistic colors so it pops against the muted flanks. Sharp focus, exaggerated detail. Dramatic single-source directional light (warm shop-floor lamp, blue welding flash, or natural window glow). Set against a workshop / factory / kitchen wall backdrop appropriate to the tool. NO people, NO hands in frame.',
      job:
        'A faceless 1950s-1970s worker mid-action — face NOT showing (cropped above shoulders, helmet down, or turned away). Hands and tools dominate the frame. Postwar industrial occupation (steel mill open-hearth helper pouring molten ladle, asbestos pipe insulator troweling cement, chrome plater dunking a bumper, refinery benzene washer hosing a condenser, lead smelter charger pushing a barrow, foundry core maker ramming sand, coal stoker shoveling, etc.). NOT desaturated — modern realistic colors so the action pops (orange molten metal, electric blue arc, white asbestos snow). Dramatic warm or arc-flash lighting. Heavy industrial setting (mill, refinery, foundry, plating shop).',
      food:
        'A hero food shot of postwar American food (1950s-1970s) — Jell-O mold with suspended fruit on a glass plate, a TV dinner aluminum tray with compartmented turkey + peas + mashed potatoes, a Pyrex casserole of tuna noodle, a Spam loaf on a serving platter, Wonder Bread sandwiches stacked on a Formica table, a Bundt cake with chocolate glaze, etc. NOT desaturated — rich modern realistic food colors. Dramatic single-source overhead or side light. Mid-century Formica or vinyl tablecloth backdrop, with a 1950s glass tumbler or chrome napkin holder visible at the edge. NO people in frame.',
      object:
        'ONE iconic mid-century artifact as the hero — a single 1940s-1980s object that is NOT a tool and NOT a food (a Bakelite radio, a chrome Cadillac fender, a Polaroid Land Camera, a typewriter, a vinyl record on a turntable, a porcelain factory shower handle, a Zenith TV cabinet, etc.). NOT desaturated — modern realistic colors. Dramatic single-source directional light. Workshop / domestic / factory backdrop appropriate to the object. NO people in frame.',
      location:
        'ONE iconic 1950s-1980s American industrial or domestic location as the hero — a single dramatic place (steel mill open-hearth furnace gallery glowing orange, a refinery flare stack at dusk, an asbestos plant carding-machine room thick with white dust, a uranium ore truck on a red-dirt Colorado plateau road, a 1950s suburban kitchen with avocado-green appliances, a Pittsburgh row-house street under coal smoke, etc.). NOT desaturated — modern realistic colors with dramatic lighting (warm furnace orange, sodium-vapor amber, low-sun gold). Wide enough to feel like a place, tight enough that ONE element dominates. NO people in frame, or only tiny silhouettes for scale.',
    },
  },
  examples: [
    {
      thumbnailTitle: 'JOBS THAT KILLED FATHERS',
      topic: '1950s American postwar trades that caused early death — steel mill helpers, asbestos insulators, lead smelters, chrome platers',
      centerSubMode: 'job',
      centerPrompt:
        'Photoreal 16:9 hero shot of a 1952 steel mill open-hearth ladle pouring a glowing orange-white stream of molten steel into a cast-iron mold below. A faceless worker silhouette in a heavy canvas welding apron and metal-mesh helmet stands at the foreground edge, hands on a long pneumatic ramming bar, face turned away from camera. Sparks rain down like firework embers. Set inside a Pittsburgh Jones-and-Laughlin-style cavernous mill hall, dark steel beams overhead, dim sodium-vapor work lights barely cutting the orange furnace glow. Modern realistic colors — molten orange, deep red shadow, blackened steel, soot-stained denim. Photorealistic, sharp focus on the molten stream and the worker\'s gripping hands. Cinematic 1950s heavy-industry atmosphere.',
      leftFigurePrompt:
        'Photoreal portrait of a 45-year-old 1950s American steel mill worker, weathered face, soot-streaked cheeks, dark stubble, short cropped brown hair under a battered chrome-yellow steel hard hat. Wearing a faded blue denim work shirt with sleeves rolled to the elbows, a thick brown leather welding apron over the chest, dark work pants. Body squared to camera, calm direct gaze. Holding a long-handled steel ladle hook in his right hand resting against his shoulder. MUTED desaturated mid-century color palette — washed-out Kodachrome look, slight cool cast (NOT sepia). Plain warm-neutral concrete-wall industrial background blurred behind him. Soft cool overhead light with a faint warm fill. Photorealistic, sharp facial detail.',
      rightFigurePrompt:
        'Photoreal portrait of a 42-year-old 1950s American working-class woman — a steelworker\'s wife. Brown hair set in soft pin-curls, slight wrinkles, tired but composed expression, calm direct gaze toward camera. Wearing a faded blue-and-white floral 1950s housedress with a white apron, a thin gold wedding band visible. Standing facing camera, holding a small framed black-and-white photograph of a man in mill work clothes against her chest with both hands. MUTED desaturated mid-century color palette to match the left figure (NOT sepia). Plain warm-neutral domestic background — faded yellow kitchen wallpaper blurred behind her. Soft natural window light from the right. Photorealistic.',
    },
    {
      thumbnailTitle: 'FORGOTTEN GARAGE TOOLS',
      topic: '1950s American garage and workshop tools that vanished by the 1980s — manual drill braces, brake bleed pumps, hand-crank tire pumps, asbestos brake riveters',
      centerSubMode: 'tool',
      centerPrompt:
        'Photoreal 16:9 hero shot of a 1955-era hand-crank manual drill brace — polished dark walnut handle, chromed steel bow, with a chunky 3/8" spiral-fluted bit locked in the chuck. Sitting alone on a battered oak workbench with faint pencil marks and oil stains. Modern realistic colors — warm walnut, tarnished steel chrome, deep amber wood-grain workbench. Dramatic single-source warm shop-lamp light from the upper-left, throwing a long crisp shadow across the bench. Sharp focus on the brass chuck collar. Faded pegboard with faint outlines of missing tools blurred in the background. NO people, NO hands in frame. Cinematic mid-century workshop atmosphere.',
      leftFigurePrompt:
        'Photoreal portrait of a 50-year-old 1955 American shadetree mechanic, slight grey at the temples, dark stubble, calm steady gaze toward camera. Wearing dark blue mechanic\'s coveralls with an embroidered "Gulf" oval patch on the chest, sleeves pushed to the forearms, grease-blackened hands. Body angled three-quarters to camera-right, seated on an upturned oil drum. Holding a chrome socket wrench in his right hand resting on his knee. MUTED desaturated mid-century color palette — washed-out Kodachrome look (NOT sepia). Plain warm-neutral garage background — corrugated metal wall blurred behind him, fluorescent shop tubes glowing softly. Soft cool overhead light with a warm fill. Photorealistic.',
      rightFigurePrompt:
        'Photoreal portrait of a 47-year-old 1955 American working-class woman, brown hair in a kerchief tied at the back, calm steady gaze toward camera, faint smile lines. Wearing a chambray work shirt rolled to the elbows over a simple cotton skirt, a small Bakelite brooch at the collar. Standing facing camera, holding a chrome thermos and a packed metal lunch pail with both hands at waist height. MUTED desaturated mid-century color palette to match the left figure (NOT sepia). Plain warm-neutral domestic background — a 1950s kitchen window with faded gingham curtains blurred behind her. Soft natural window light from the right. Photorealistic.',
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
  s1950s: {
    id: 's1950s',
    label: '1950s',
    imageMode: 'ai',
    supportedScriptTypes: ['listicle'],
    thumbnail: {},
    aiThumbnail: {
      listicle: S1950S_LISTICLE_AI_THUMBNAIL,
    },
    voice: S1950S_VOICE,
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
