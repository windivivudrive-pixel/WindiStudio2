
export enum AppMode {
  CREATIVE_POSE = 'CREATIVE_POSE',
  VIRTUAL_TRY_ON = 'VIRTUAL_TRY_ON',
  CREATE_MODEL = 'CREATE_MODEL',
  COPY_CONCEPT = 'COPY_CONCEPT',
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

// Map to 'generations' table
export interface HistoryItem {
  id: string; // BigInt converted to string
  thumbnail: string; // image_url
  images: string[]; // For UI compatibility (batch logic)
  prompt: string;
  timestamp: number; // created_at converted to timestamp
  mode: AppMode;
  modelName?: string;
  cost?: number;
}

// Map to 'profiles' table
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  payment_code: string;
  credits: number;
  referred_by_code?: string;
}

// Map to 'transactions' table
export interface Transaction {
  id: number;
  user_id: string;
  amount_vnd: number;
  credits_added: number;
  type: 'DEPOSIT' | 'BONUS_REF' | 'BONUS_NEW';
  content: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  created_at: string;
}

export interface GenerationConfig {
  mode: AppMode;
  primaryImage: string | null;
  secondaryImage: string | null;
  userPrompt: string;
  aspectRatio: AspectRatio;
  numberOfImages: number;
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
