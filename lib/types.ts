export interface VisualElement {
  id: string;
  type: 'main-title' | 'listicle-heading' | 'point-of-interest';
  text: string;
  timestamp?: number;
  timestampEnd?: number;
}

export interface AnalyzeRequest {
  script: string;
  customInstructions?: string;
}

export interface AnalyzeResponse {
  elements: VisualElement[];
}

export interface CustomizationOptions {
  textColor: string;
  backgroundColor: string;
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
