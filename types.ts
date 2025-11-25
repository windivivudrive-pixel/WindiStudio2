
export enum AppMode {
  CREATIVE_POSE = 'CREATIVE_POSE',
  VIRTUAL_TRY_ON = 'VIRTUAL_TRY_ON',
  CREATE_MODEL = 'CREATE_MODEL',
  COPY_CONCEPT = 'COPY_CONCEPT',
}

export enum ImageSize {
  SIZE_1K = '1K',
  SIZE_2K = '2K',
  SIZE_4K = '4K',
}

export enum AspectRatio {
  SQUARE = '1:1',
  STANDARD = '2:3',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16',
}

export enum BackgroundMode {
  SIMILAR = 'SIMILAR',
  EXACT = 'EXACT',
}

export interface HistoryItem {
  id: string;
  thumbnail: string;
  images: string[]; // Changed from fullImage to support batches
  prompt: string;
  timestamp: number;
  mode: AppMode;
  modelName?: string; // Added to track which model generated this
}

export interface GenerationConfig {
  mode: AppMode;
  primaryImage: string | null; // Base64
  secondaryImage: string | null; // Base64
  userPrompt: string;
  size: ImageSize;
  aspectRatio: AspectRatio;
  numberOfImages: number;
  // Advanced features
  poseImage?: string | null;
  backgroundImage?: string | null;
  backgroundMode?: BackgroundMode;
  faceReferences?: string[];
  conceptReferences?: string[];
  flexibleMode?: boolean;
  randomFace?: boolean;
}

export interface GenerationResponse {
  imageUrls: string[];
  error: string | null;
}