// Cloudflare Workers API Configuration
// After deploying, update this with your actual worker URL

// Default to empty, will be set after deployment
// Format: https://windi-api.YOUR_SUBDOMAIN.workers.dev
export const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || '';

// Helper to check if Cloudflare Workers is configured
export const isCloudflareConfigured = () => !!CLOUDFLARE_WORKER_URL;

// API endpoints
export const getGenerateImageUrl = () => `${CLOUDFLARE_WORKER_URL}/generate-image`;
export const getGalleryUrl = () => `${CLOUDFLARE_WORKER_URL}/get-gallery`;
export const getProxyImageUrl = () => `${CLOUDFLARE_WORKER_URL}/proxy-image`;
