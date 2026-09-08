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

export interface HistoryItem {
  id: string;
  thumbnail: string;
  images: string[];
  prompt: string;
  timestamp: number;
  mode: AppMode;
  modelName?: string;
  cost?: number;
  imageType?: 'STANDARD' | 'PREMIUM' | 'SCALEX2' | 'SCALE2' | 'SCALE4' | 'S4.0' | 'S4.5';
  isFavorite?: boolean;
  categoryId?: number;
  userEmail?: string;
}

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
  layoutMode?: 'single' | 'loop';
  x?: number;
  y?: number;
  gap?: number;
  applyToPreview?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  margin?: number;
  scale: number;
  opacity: number;
}

export interface GenerationResponse {
  imageUrls: string[];
  error: string | null;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
  section_type?: 'STUDIO' | 'CREATIVE';
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

// --- NEW COMMERCE TYPES ---
export type ProductType = 'STUDIO_LICENSE' | 'VOICE_UNITS';
export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'UNDERPAID' | 'OVERPAID' | 'REVIEW_REQUIRED' | 'REFUNDED';
export type LicenseStatus = 'ACTIVE' | 'REVOKED';

export interface Product {
    id: string;
    name: string;
    type: ProductType;
    description: string;
    price_vnd: number;
    is_active: boolean;
    metadata: Record<string, any>;
}

export interface Order {
    id: string;
    user_id: string;
    total_amount_vnd: number;
    status: OrderStatus;
    payment_code: string;
    created_at: string;
    expires_at: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_vnd: number;
    created_at: string;
}

export interface CreatorFlowLicense {
    id: string;
    user_id: string;
    status: LicenseStatus;
    created_at: string;
}

export interface VoiceWallet {
    user_id: string;
    balance: number;
    updated_at: string;
}

export interface CustomerVoice {
    id: string;
    user_id: string;
    provider_voice_id: string;
    name: string;
    is_private: boolean;
    consent_timestamp: string;
}
