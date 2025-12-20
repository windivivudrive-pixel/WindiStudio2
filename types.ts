
export enum AppMode {
  CREATIVE_POSE = 'CREATIVE_POSE',
  VIRTUAL_TRY_ON = 'VIRTUAL_TRY_ON',
  CREATE_MODEL = 'CREATE_MODEL',
  COPY_CONCEPT = 'COPY_CONCEPT',
  CREATIVE = 'CREATIVE',
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
  imageType?: 'STANDARD' | 'PREMIUM' | 'SCALEX2' | 'SCALE2' | 'SCALE4' | 'S4.0' | 'S4.5';
  isFavorite?: boolean;
  categoryId?: number;
  userEmail?: string;
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
  warning_count?: number;
  banned?: boolean;
  branding_logo_url?: string;
  branding_config?: BrandingConfig;
  role?: 'user' | 'admin';
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

export interface BrandingConfig {
  layoutMode?: 'single' | 'loop'; // New: Single or Repeating Pattern
  x?: number; // 0-100% position
  y?: number; // 0-100% position
  gap?: number; // Spacing for loop mode
  applyToPreview?: boolean; // New: Toggle between "Always Visible" (true) vs "Download Only" (false)

  // Deprecated/Legacy support (optional now)
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  margin?: number;

  scale: number; // 0.1 to 0.5 (10% to 50% of image width)
  opacity: number; // 0.1 to 1.0
}

export interface GenerationResponse {
  imageUrls: string[];
  error: string | null;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface LibraryImage {
  id: number;
  image_url: string;
  category_id: number;
  created_at: string;
  prompt?: string;
  image_type?: string;
  user_id?: string;
}
