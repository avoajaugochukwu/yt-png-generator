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
      'Photoreal 16:9 thumbnail composed of three independently generated panels. Left ~25%, center ~50%, right ~25%. Single horizontal frame. Postwar American world (1940-1985) — steel mills, refineries, sawmills, foundries, auto plants, suburban kitchens, factory floors. COMPOSITION RULES (strict): (a) The flanking figures must read as authentic SCANNED 1950s consumer-film photographs — visible film grain, paper-print texture, halation in the highlights, gentle edge vignette, deep desaturated sepia with muddy-brown shadows and cream highlights, higher contrast than a modern softbox portrait. They must NOT look like a modern stock-photo subject with a sepia filter slapped on top — that gritty scanned-photo character is the entire point of the channel\'s look. (b) Both flanking figures must face INWARD toward the center panel — left figure\'s body and face turn to camera-right (looking toward the right edge of their panel), right figure\'s body and face turn to camera-left (looking toward the left edge of their panel). The trio reads as one composition, not three isolated panels. (c) The center panel is a TIGHT EXTREME CLOSE-UP of a single visually arresting period artifact / piece of equipment that fills almost the entire frame edge-to-edge, with dark blurred-out vignette edges (out-of-focus dim background that surrounds the hero subject and frames it). Modern realistic saturated colors so the center pops dramatically against the muted sepia flanks. The center subject should be obviously vintage / old-timey — the most odd-looking, exaggerated, weird-looking period equipment you can find for the topic, picked specifically to grab attention. Two people on the flanks, NEVER a person in the center.',
    leftFigure:
      'A working-class American man, 35-55, mid-century era (1945-1975), styled as a scanned 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn slightly to camera-RIGHT — he is looking INWARD toward the right edge of the panel (toward the center panel, which sits to his right in the final composition). His gaze lands just off-camera to the right; he is NOT looking straight into the lens. Three-quarter or near-profile angle so the inward-facing direction reads clearly. Period-correct clothing — soot-streaked denim work shirt with rolled sleeves, dark work pants, worn leather work boots; or a hard hat + safety glasses + canvas welding apron. Garments show real wear — wash-fade, frayed cuffs, threadbare patches, oil or soot stains, stitched-over tears, mismatched buttons. Heavily weathered, lived-in face — deep sun lines and crow\'s feet, pronounced pores, broken capillaries on the nose, dirt or soot caught in skin creases, day-old stubble, calloused knuckles, no glamour styling. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around the highlights, faint paper-print texture, gentle edge vignette, mild tonal compression in the midtones. Deep desaturated sepia / warm-tone palette — muddy-brown shadows, cream highlights, never pure black or pure white. Higher contrast and harder shadow falloff than a modern softbox photograph. Plain warm-neutral industrial backdrop (concrete wall, sheet metal, factory shop floor blur) with subtle soot or grime, NOT a clean modern interior. Holding a tool or workplace artifact relevant to the topic. Single warm directional shop-lamp or window light, like a faded 1950s factory-floor press photograph.',
    rightFigure:
      'A 1950s working-class American woman, 30-55 — usually a wife / housewife / widow figure — styled as a scanned 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn slightly to camera-LEFT — she is looking INWARD toward the left edge of the panel (toward the center panel, which sits to her left in the final composition). Her gaze lands just off-camera to the left; she is NOT looking straight into the lens. Three-quarter or near-profile angle so the inward-facing direction reads clearly. Period-correct clothing — a 1950s housedress with apron, or a Sunday-best blouse and skirt; hair pin-curled, set, or in a kerchief. Garments show real wear — faded floral print, slightly creased apron with faint kitchen stains, simple stitched mends, plain functional cuts (NOT a stylized modern "vintage" outfit). Lived-in face — visible skin texture and pores, fine lines around the eyes and mouth, faint freckles or sun-spots, slightly chapped hands, no modern makeup beyond a worn dark lipstick, hair with realistic flyaways at the temples. Tired but composed expression. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around window highlights, faint paper-print texture, gentle edge vignette, mild tonal compression in the midtones. Deep desaturated sepia / warm-tone palette to match the left figure — muddy-brown shadows, cream highlights, never pure black or pure white. Higher contrast and harder shadow falloff than a modern softbox portrait. Holding an object thematically linked to the topic but DIFFERENT from the left figure (a folded company letter, a Bakelite radio, a Pyrex casserole, a framed work photo of her husband). Plain warm-neutral domestic backdrop — faded floral wallpaper or kitchen tile or Formica counter blur, slightly aged and lived-in (yellowed, scuffed, NOT a pristine modern interior). Soft natural window light from the side with the slight overexposure typical of 1950s consumer film.',
    center: {
      tool:
        'EXTREME CLOSE-UP of ONE odd-looking mid-century industrial or domestic tool / instrument as the hero — a single weird vintage artifact that fills the frame edge-to-edge (asbestos hopper spray gun, hex-chrome plating rack, lead-paint mixing mill, copper rivet hammer, vintage Geiger counter, oxy-acetylene torch, hand-crank meat grinder with iron auger, mercury manometer, asbestos brake riveter, hand-cranked tire pump, brass surveyor\'s transit, etc.). Pick the WEIRDEST / MOST VISUALLY ARRESTING period option for the topic — strange shape, exposed mechanisms, unusual coils / valves / gauges / handles — something that looks alien and fascinating to a modern viewer. The tool itself takes up roughly 70-90% of the frame; the edges of the frame are dark, blurred, out-of-focus background that vignettes around the hero. Modern realistic saturated colors (NOT sepia) — warm metals, polished brass, tarnished chrome, deep walnut, rich rust patina — so the center pops dramatically against the sepia flanks. Sharp focus and exaggerated detail on the most unusual feature of the tool. Dramatic single-source directional light (warm shop-lamp glow, blue welding flash, or hot orange furnace bloom) raking across the surfaces. Workshop / factory / kitchen backdrop appropriate to the tool but BLURRED INTO DARKNESS at the frame edges. NO people, NO hands in frame.',
      job:
        'EXTREME CLOSE-UP of the ONE most odd-looking, most visually arresting piece of EQUIPMENT used by the occupation in question — NOT the worker themselves (we already have two people on the flanks, the center is the iconic tool of their trade). The equipment fills the frame edge-to-edge. Pick the strangest, most attention-grabbing piece of gear from that job\'s toolset — exposed mechanisms, glowing elements, unusual valves, weird linkages, soot- or oil-blackened surfaces (e.g. for a steel mill open-hearth helper → a glowing red-orange ladle hook with molten residue dripping from it, NOT a worker pouring; for an asbestos pipe insulator → a bizarre asbestos-shaker spray gun with feed hopper and brass nozzles, NOT a worker troweling; for a chrome plater → a fume-belching hex-chrome plating rack with bubbling green-yellow electrolyte, NOT a worker dunking; for a refinery benzene washer → a tangle of corroded brass valves on a benzene condenser, NOT a worker hosing). The piece of equipment takes up roughly 70-90% of the frame; edges are dark, blurred, out-of-focus background that vignettes around the hero — hint at the heavy-industrial setting (mill / refinery / foundry / plating shop) but keep it dim and blurred. Modern realistic saturated colors (NOT sepia) so the action pops against the sepia flanks (orange molten metal glow, electric blue arc, sickly chemical green, hot white asbestos dust caught in a single shaft of light). Dramatic warm-or-arc-flash lighting. Sharp focus on the strangest feature of the equipment. NO people, NO hands, NO faces in frame.',
      food:
        'EXTREME CLOSE-UP of ONE odd-looking postwar American food (1950s-1970s) as the hero — a single weird vintage dish that fills the frame edge-to-edge (Jell-O mold with suspended fruit and chunks of canned ham wobbling in lime aspic, a TV dinner aluminum tray with compartmented grey turkey + olive-green peas + lumpy mashed potatoes, a Pyrex casserole bubbling tuna noodle with crushed-potato-chip topping, a Spam loaf glazed with brown sugar and pineapple rings, a tower of Wonder Bread + bologna + iceberg sandwiches, a fluorescent-orange cheese log rolled in chopped pecans, a Bundt cake with chocolate glaze and maraschino cherries, etc.). Pick the WEIRDEST / MOST OFF-PUTTING-FASCINATING option for the topic — gelatinous, suspended, lurid colors, mid-century-strange combinations. The food takes up roughly 70-90% of the frame; the edges are dark, blurred, out-of-focus background that vignettes around the hero. Modern realistic saturated food colors (NOT sepia) — emerald aspic, sunset-orange Velveeta, bubbling red tomato sauce, glossy chocolate — so it pops dramatically against the sepia flanks. Dramatic single-source overhead or side light. A faint hint of mid-century Formica or vinyl tablecloth at the very edge of the close-up, otherwise blurred dark. NO people, NO hands in frame.',
      object:
        'EXTREME CLOSE-UP of ONE odd-looking mid-century artifact as the hero — a single weird 1940s-1980s object (NOT a tool and NOT a food) that fills the frame edge-to-edge (a Bakelite tabletop radio with glowing amber dial, a chrome Cadillac tail fin with embedded jet-engine-style cone, a Polaroid Land Camera with leather bellows, a typewriter with sun-bleached keys and frayed ribbon, a vinyl record mid-spin on a hi-fi turntable, a porcelain factory safety shower handle with corroded pull-chain, a Zenith console TV cabinet with rounded green CRT, etc.). Pick the WEIRDEST / MOST VISUALLY ARRESTING period option for the topic — strange shape, exposed inner workings, unusual textures, period-specific weirdness — something that looks alien and fascinating to a modern viewer. The object takes up roughly 70-90% of the frame; edges are dark, blurred, out-of-focus background that vignettes around the hero. Modern realistic saturated colors (NOT sepia) — warm walnut grain, glowing radio dial amber, polished chrome, deep Bakelite browns — so it pops dramatically against the sepia flanks. Dramatic single-source directional light raking across the surfaces. Workshop / domestic / factory backdrop appropriate to the object but BLURRED INTO DARKNESS at the frame edges. NO people, NO hands in frame.',
      location:
        'TIGHT close-up of ONE iconic 1950s-1980s American industrial or domestic location as the hero — a single dramatic place where ONE element absolutely dominates the frame (the white-hot mouth of a steel mill open-hearth furnace glowing orange-yellow, a refinery flare stack belching flame at dusk, the carding-room rollers of an asbestos plant choking the air with white dust, a uranium ore truck cresting a red-dirt Colorado plateau road at sunset, a 1950s suburban kitchen with avocado-green appliances and a chrome electric stove front-and-center, etc.). The dominant element fills roughly 60-80% of the frame; the rest of the location dim and blurred at the edges to vignette around it. Modern realistic saturated colors (NOT sepia) with dramatic lighting so it pops against the sepia flanks (warm furnace orange, sodium-vapor amber, low-sun gold). NO people in frame, or only tiny silhouettes for scale.',
    },
  },
  examples: [
    {
      thumbnailTitle: 'JOBS THAT KILLED FATHERS',
      topic: '1950s American postwar trades that caused early death — steel mill helpers, asbestos insulators, lead smelters, chrome platers',
      centerSubMode: 'job',
      centerPrompt:
        'Photoreal 16:9 EXTREME CLOSE-UP of a single 1952 steel mill open-hearth ladle hook — a brutally heavy long-handled cast-iron tool with a glowing red-orange tip that has just been pulled from the molten steel, with a thin rivulet of cooling slag dripping from the curved hook back down toward an out-of-focus pool of orange below. The tool fills 80% of the frame edge-to-edge — battered iron shaft with hammered ridges, scorched soot-blackened middle section, the hook end glowing dull orange-red with bright yellow-white at the very tip where it touched the melt. Modern realistic saturated colors (NOT sepia) — molten orange, deep red shadow, blackened iron, faint blue plasma flicker. Edges of the frame are dark, blurred, out-of-focus background — a hint of cavernous Pittsburgh mill hall (steel beams, sodium-vapor lamp blooms) but mostly dropped to near-black so the glowing tool dominates. Single warm furnace-orange light source from below-left raking across the hot tip. Sharp focus on the dripping slag and the glowing hook. NO people, NO hands, NO faces in frame. Cinematic 1950s heavy-industry hero shot.',
      leftFigurePrompt:
        'Photoreal portrait of a 45-year-old 1950s American steel mill worker, styled as a SCANNED 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn slightly to camera-RIGHT — looking INWARD toward the right edge of the panel, gaze landing just off-camera to the right (NOT into the lens). Three-quarter angle. Heavily weathered face, deep crow\'s feet and sun lines, pronounced pores, broken capillaries on the nose, soot-streaked cheeks, dark stubble, calloused knuckles, short cropped brown hair under a dented battle-worn steel hard hat. Wearing a faded denim work shirt — visible wash-fade, frayed cuffs, missing top button, faint soot stains — with sleeves rolled to the elbows, a scuffed leather welding apron with old burn marks over the chest, dark work pants worn shiny at the knees. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around the highlights, faint paper-print texture, gentle edge vignette, mild tonal compression. Deep desaturated sepia / warm-tone palette — muddy-brown shadows, cream highlights, no pure black, no pure white. Plain warm-neutral concrete-wall industrial background with subtle soot blurred behind him. Single warm directional shop-lamp light from the right side (consistent with him looking right), harder shadow falloff than a modern softbox portrait. Reads as a 1950s factory-floor press photograph.',
      rightFigurePrompt:
        'Photoreal portrait of a 42-year-old 1950s American working-class woman — a steelworker\'s wife — styled as a SCANNED 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn slightly to camera-LEFT — looking INWARD toward the left edge of the panel, gaze landing just off-camera to the left (NOT into the lens). Three-quarter angle. Brown hair set in soft pin-curls with realistic flyaways at the temples, faint forehead and laugh lines, faded freckles across the nose, slightly chapped hands, tired but composed expression, no modern makeup beyond a worn dark lipstick. Wearing a faded floral 1950s housedress — visible print fade and a small mended seam at the shoulder — with a white apron showing a faint kitchen stain, a thin gold wedding band on her finger. Holding a small framed photograph of a man in mill work clothes against her chest with both hands. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around the window highlight, faint paper-print texture, gentle edge vignette. Deep desaturated sepia / warm-tone palette to match the left figure — muddy-brown shadows, cream highlights, no pure black, no pure white. Plain warm-neutral domestic background — faded patterned wallpaper, slightly yellowed and scuffed, blurred behind her. Soft natural window light from the left side (consistent with her looking left) with the slight overexposure typical of 1950s consumer film. Reads as a 1950s family photograph.',
    },
    {
      thumbnailTitle: 'FORGOTTEN GARAGE TOOLS',
      topic: '1950s American garage and workshop tools that vanished by the 1980s — manual drill braces, brake bleed pumps, hand-crank tire pumps, asbestos brake riveters',
      centerSubMode: 'tool',
      centerPrompt:
        'Photoreal 16:9 EXTREME CLOSE-UP of a single 1955-era asbestos brake-shoe riveter — a strange-looking pre-OSHA garage tool that fills 80% of the frame edge-to-edge: a heavy cast-iron pedestal with a long pivoting press-arm, a brass plunger head still smeared with grey-white asbestos dust, exposed coil spring, knurled adjustment screw, oil-stained pivot pin, and a single half-driven copper rivet caught mid-press in the jaws. Modern realistic saturated colors (NOT sepia) — tarnished cast iron, brass plunger head, fine grey-white asbestos powder caught in the angled light, copper rivet warm-orange. The tool dominates the frame; edges of the frame are dark, blurred, out-of-focus background — a hint of pegboard with faint outlines of missing tools and a fluorescent-tube bloom in the upper corner, but otherwise dropped to near-black so the riveter dominates. Single warm directional shop-lamp light from upper-left raking across the asbestos dust and the brass head. Sharp focus on the half-driven rivet and the powder caught in the air. NO people, NO hands in frame. Cinematic mid-century workshop hero shot.',
      leftFigurePrompt:
        'Photoreal portrait of a 50-year-old 1955 American shadetree mechanic, styled as a SCANNED 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn three-quarters to camera-RIGHT — looking INWARD toward the right edge of the panel, gaze landing just off-camera to the right (NOT into the lens). Slight grey at the temples, dark stubble, deep sun lines around the eyes, grease in the creases of the knuckles, faintly soot-darkened pores. Wearing dark mechanic\'s coveralls — faded from years of washing, an embroidered "Gulf" oval patch on the chest with thread fraying at the edge, sleeves pushed to the forearms, grease-blackened cuffs. Seated on an upturned oil drum with rust around the rim. Holding a slightly tarnished chrome socket wrench in his right hand resting on his knee. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around the bulb highlights, faint paper-print texture, gentle edge vignette, mild tonal compression. Deep desaturated sepia / warm-tone palette — muddy-brown shadows, cream highlights, no pure black, no pure white. Plain warm-neutral garage background — corrugated metal wall blurred behind him, fluorescent shop tubes glowing softly. Single warm directional bulb light from the right side (consistent with him looking right), harder shadow falloff than a modern softbox photograph. Reads as a 1950s working-garage press photograph.',
      rightFigurePrompt:
        'Photoreal portrait of a 47-year-old 1955 American working-class woman, styled as a SCANNED 1950s consumer-film photograph (NOT a modern photo with a sepia filter). Body and face turn three-quarters to camera-LEFT — looking INWARD toward the left edge of the panel, gaze landing just off-camera to the left (NOT into the lens). Brown hair tied back in a faded floral kerchief with realistic flyaways at the temples, faint smile lines, freckles across the nose, slightly chapped hands, no modern makeup beyond a worn lipstick. Wearing a chambray work shirt — faded from washing, a small mended tear at the cuff — rolled to the elbows over a simple cotton skirt, a small Bakelite brooch at the collar. Holding a slightly dented chrome thermos and a packed metal lunch pail with both hands at waist height. Visible Kodachrome / Tri-X-era film grain across the whole frame, slight halation around the window highlights, faint paper-print texture, gentle edge vignette. Deep desaturated sepia / warm-tone palette to match the left figure — muddy-brown shadows, cream highlights, no pure black, no pure white. Plain warm-neutral domestic background — a 1950s kitchen window with faded gingham curtains slightly yellowed with age, blurred behind her. Soft natural window light from the left side (consistent with her looking left) with the slight overexposure typical of 1950s consumer film. Reads as a 1950s family photograph.',
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
