import type { GridTemplate, ScriptType } from './types';

export type Channel = 'garden';

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

export interface ChannelConfig {
  id: Channel;
  label: string;
  imageMode: ImageSourceMode;
  supportedScriptTypes: ScriptType[];
  thumbnail: Partial<Record<ScriptType, ThumbnailSpec>>;
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
  },
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
};

export function getThumbnailSpec(channel: Channel, scriptType: ScriptType): ThumbnailSpec | null {
  return CHANNELS[channel]?.thumbnail[scriptType] ?? null;
}
