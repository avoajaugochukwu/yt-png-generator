export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeResponse {
  segments: TranscriptSegment[];
  fullText: string;
}

export interface VisualElement {
  id: string;
  type: 'main-title' | 'listicle-heading' | 'point-of-interest' | 'subscribe';
  text: string;
  timestamp?: number;
  timestampEnd?: number;
}

export interface AnalyzeRequest {
  script: string;
  customInstructions?: string;
  segments?: TranscriptSegment[];
}

export type ScriptType =
  | 'listicle'
  | 'tutorial'
  | 'explainer'
  | 'essay'
  | 'narrative'
  | 'commentary'
  | 'other';

export interface AnalyzeResponse {
  suggestedTitle?: string;
  scriptType: ScriptType;
  elements: VisualElement[];
}

export interface CustomizationOptions {
  textColor: string;
  backgroundColor: string;
  barColor: string;
  fontFamily: string;
}

export interface GenerateRequest {
  elements: VisualElement[];
  customization: CustomizationOptions;
}

export interface TimelineEntry {
  filename: string;
  text: string;
  type: VisualElement['type'];
  start_time: string | null;
  end_time: string | null;
  position: string;
  width: number;
  height: number;
  pngBase64?: string;
}

export interface TimelineJson {
  generatedAt: string;
  entries: TimelineEntry[];
}

export type AppStep = 'input' | 'analyzing' | 'customizing' | 'generating' | 'done';

// ── Gridder types ──

export interface CellDef {
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface GridTemplate {
  id: string;
  label: string;
  cols: number;
  rows: number;
  /** Optional per-column weight ratios (e.g. [7, 3] for 70/30 split). Defaults to equal weights. */
  colWeights?: number[];
  /** Optional custom cell layout with spans. Overrides the uniform grid when present. */
  cellDefs?: CellDef[];
}

export interface GridCellData {
  id: string;
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  imageUrl: string | null;
  cropOffsetX: number;
  cropOffsetY: number;
  zoom: number;
  keyword: string;
}

export interface GridderState {
  template: GridTemplate;
  cells: GridCellData[];
  gap: number;
  borderRadius: number;
  backgroundColor: string;
}

export type GridderStep = 'setup' | 'filling' | 'done';

// ── Package types ──

export interface TitleOption {
  title: string;
  principle: string;
  principleNumber: number;
  estimatedCTR: 'high' | 'medium';
  primaryText: string;
  secondaryText: string;
}

export interface PackageSeoResponse {
  /** Top N keywords (N = thumbnail spec imageCount) used to pre-fill thumbnail cells. Empty for AI-image channels. */
  imageKeywords: string[];
  /** Full exhaustive list of searchable subjects found in the script (15-25). */
  allKeywords: string[];
  titles: TitleOption[];
  tags: string[];
}

// ── Heritage (AI-image channel) types ──

export type HeritageCenterSubMode = 'object' | 'job' | 'food';

export interface HeritagePromptGroup {
  /** Plain-English description of what this prompt produces. */
  description: string;
  /** Three full image-gen prompt variations the user can pick from. */
  variations: string[];
}

export interface HeritagePromptResponse {
  /** Short ALL-CAPS hook for the thumbnail's top bar (e.g. "FORGOTTEN FARM TRICKS"). 2-4 words. */
  thumbnailTitle: string;
  /** Echo of the chosen center sub-mode. */
  centerSubMode: HeritageCenterSubMode;
  prompts: {
    /** Center subject — modern colors, dramatic, single-focus. */
    center: HeritagePromptGroup;
    /** Left flanking figure — sepia-toned 1800s person. */
    leftFigure: HeritagePromptGroup;
    /** Right flanking figure — sepia-toned 1800s person, different from left. */
    rightFigure: HeritagePromptGroup;
  };
}
