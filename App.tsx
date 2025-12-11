import React, { useState, useEffect, useRef } from 'react';
import Pricing from './components/Pricing';
import { Sparkles, Shirt, Camera, Wand2, Download, AlertCircle, History, Trash2, ChevronDown, ChevronUp, User, Image as ImageIcon, Bone, Layers, ToggleLeft, ToggleRight, XCircle, Archive, Shuffle, Copy, ScanFace, RefreshCw, LogIn, Coins, X, CreditCard, Wallet, LogOut, Zap, Cloud, ArrowLeft, Calendar, FileText, CheckCircle, XOctagon, QrCode, Smartphone, Check, Maximize2, Plus, Stamp, Heart, Star } from 'lucide-react';
import JSZip from 'jszip';
import { AppMode, AspectRatio, HistoryItem, UserProfile, Transaction } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { AnimatedLogo } from './components/AnimatedLogo';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { generateStudioImage, ensureApiKey } from './services/geminiService';
import { BrandingPage } from './components/BrandingPage';

import { StudioTabs } from './components/StudioTabs';
import { LibraryView } from './components/LibraryView';
import { useBranding } from './utils/useBranding';
import {
  signInWithGoogle,
  signOut,
  createProfileIfNotExists,
  updateUserCredits,
  saveGenerationToDb,
  fetchHistoryFromDb,
  deleteHistoryFromDb,
  fetchTransactions,
  createTransaction,
  getProfile
} from './services/supabaseService';
import { supabase } from './services/supabaseClient';

// --- CONFIG BANKING (THAY THÔNG TIN CỦA BẠN VÀO ĐÂY) ---
const BANK_CONFIG = {
  BANK_ID: 'TPB', // VD: MB, VCB, TPB, ACB... (Mã ngân hàng)
  ACCOUNT_NO: '55111685555', // Số tài khoản của bạn
  ACCOUNT_NAME: 'BUI QUOC HUNG', // Tên chủ tài khoản
  TEMPLATE: 'compact' // compact, print, qr_only
};

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'STUDIO' | 'HISTORY' | 'PAYMENT' | 'PRIVACY' | 'BRANDING'>('STUDIO');
  const [studioTab, setStudioTab] = useState<'studio' | 'fun' | 'library'>('studio');

  // Main State
  const [mode, setMode] = useState<AppMode>(AppMode.CREATIVE_POSE);
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash-image');
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [secondaryImage, setSecondaryImage] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');

  // Advanced Features State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [flexibleMode, setFlexibleMode] = useState(false);
  const [randomFace, setRandomFace] = useState(false);

  // Application State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingState, setLoadingState] = useState({ title: "Dreaming...", subtitle: "Synthesizing pixels with Gemini" });
  const [results, setResults] = useState<string[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ message: string; code?: string } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [accessoryImages, setAccessoryImages] = useState<string[]>([]);

  // Auto-switch to Pro model when accessory images are added
  useEffect(() => {
    if (accessoryImages.length > 0 && selectedModel !== 'gemini-3-pro-image-preview') {
      setSelectedModel('gemini-3-pro-image-preview');
      setToast({ message: "Switched to Pro model for accessory support", type: 'success' });
    }
  }, [accessoryImages, selectedModel]);

  // Auto-switch model based on mode: Pose → Air, Try-on/Model → Pro
  useEffect(() => {
    if (mode === AppMode.CREATIVE_POSE && selectedModel !== 'gemini-2.5-flash-image') {
      setSelectedModel('gemini-2.5-flash-image');
      setAccessoryImages([]);
    } else if ((mode === AppMode.VIRTUAL_TRY_ON || mode === AppMode.CREATE_MODEL) && selectedModel !== 'gemini-3-pro-image-preview') {
      setSelectedModel('gemini-3-pro-image-preview');
    }
  }, [mode]);

  // User & Billing State
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Payment State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpStep, setTopUpStep] = useState<'INPUT' | 'QR'>('INPUT');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [calculatedCoins, setCalculatedCoins] = useState(0);
  const [qrUrl, setQrUrl] = useState('');
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [viewingHistoryDuringGeneration, setViewingHistoryDuringGeneration] = useState(false);

  // Branding State (Managed by Custom Hook)
  const {
    brandingLogo,
    setBrandingLogo,
    brandingConfig,
    setBrandingConfig,
    isSavingBranding,
    handleSaveBranding
  } = useBranding(userProfile, setUserProfile);
  // Refs
  const outputRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.email === 'quochungdn151@gmail.com';
  console.log("App.tsx - UserProfile:", userProfile);
  console.log("App.tsx - isAdmin:", isAdmin);
  const [showUpscaleModal, setShowUpscaleModal] = useState(false);

  /* --- BRANDING FEATURE START --- */
  // Effect to generate watermarked image for DISPLAY (Preview Quality)
  // This runs automatically so users see the logo and can Long-Press on mobile
  useEffect(() => {
    const rawImage = results[selectedResultIndex];
    if (!rawImage) {
      setDisplayImage(null);
      return;
    }

    // Check config: If user turned OFF 'Apply to Preview', show raw image.
    // Default applyToPreview to true if undefined
    const shouldApply = brandingConfig?.applyToPreview !== false;

    // If no branding OR logic says skip, just show raw image
    if (!brandingLogo || !brandingConfig || !shouldApply) {
      setDisplayImage(rawImage);
      return;
    }

    const composeImage = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = rawImage;
        await img.decode(); // Wait for load

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw Base
        ctx.drawImage(img, 0, 0);

        // Draw Logo
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.src = brandingLogo;
        await logo.decode();

        const scale = brandingConfig.scale || 0.2;
        const logoW = img.width * scale;
        const logoH = logoW * (logo.height / logo.width);
        const posXPercent = brandingConfig.x !== undefined ? brandingConfig.x : 90;
        const posYPercent = brandingConfig.y !== undefined ? brandingConfig.y : 90;

        ctx.globalAlpha = brandingConfig.opacity || 1.0;

        if (brandingConfig.layoutMode === 'loop') {
          const yPos = (img.height * posYPercent) / 100 - (logoH / 2);
          const gap = brandingConfig.gap || 10;
          let currentX = 0;
          while (currentX < img.width) {
            ctx.drawImage(logo, currentX, yPos, logoW, logoH);
            currentX += logoW + gap;
          }
        } else {
          const xPos = (img.width * posXPercent) / 100 - (logoW / 2);
          const yPos = (img.height * posYPercent) / 100 - (logoH / 2);
          ctx.drawImage(logo, xPos, yPos, logoW, logoH);
        }

        ctx.globalAlpha = 1.0;

        // Set as blob url for PREVIEW (0.95 Quality is fine for screen)
        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setDisplayImage(url);
          }
        }, 'image/jpeg', 1);

      } catch (e) {
        console.error("Failed to composite branding preview", e);
        setDisplayImage(rawImage);
      }
    };

    composeImage();

    return () => {
      if (displayImage && displayImage.startsWith('blob:')) {
        URL.revokeObjectURL(displayImage);
      }
    };
  }, [results, selectedResultIndex, brandingLogo, brandingConfig]);
  /* --- BRANDING FEATURE END --- */


  // --- INITIALIZATION ---


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        initializeUser(session.user);
        // After login, navigate to studio if coming from OAuth redirect
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'studio' || window.location.hash.includes('access_token')) {
          setCurrentView('STUDIO');
          // Clean up URL hash from OAuth
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState({}, '', window.location.pathname + '?view=studio&tab=studio');
          }
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        initializeUser(session.user);
        // After login via OAuth, redirect to studio
        if (_event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
          setCurrentView('STUDIO');
          window.history.replaceState({}, '', window.location.pathname + '?view=studio&tab=studio');
        }
      }
      else setUserProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- NAVIGATION & HISTORY ---

  const navigateTo = (view: typeof currentView, replace = false, tab?: 'studio' | 'fun' | 'library') => {
    setCurrentView(view);

    let nextTab = tab;
    if (!nextTab && view === 'STUDIO') {
      nextTab = studioTab;
    }

    if (nextTab) setStudioTab(nextTab);

    const url = new URL(window.location.href);
    url.searchParams.set('view', view.toLowerCase());

    if (nextTab) {
      url.searchParams.set('tab', nextTab);
    }

    const state = { view, tab: nextTab };

    if (replace) {
      window.history.replaceState(state, '', url.toString());
    } else {
      window.history.pushState(state, '', url.toString());
    }
  };

  // Handle Browser Back/Forward & Modals
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      console.log("PopState:", event.state, window.location.href);

      // Handle Modals first (if open, close them and maybe stop?)
      // Note: Native back button will change URL regardless. 
      // We just need to sync state.

      if (showTopUpModal) {
        setShowTopUpModal(false);
        // If we want to prevent navigation when closing modal, we'd need to push state when opening it.
        // Assuming we just want to sync view now.
      }
      if (showLoginModal) {
        setShowLoginModal(false);
      }
      if (showPricingModal) {
        setShowPricingModal(false);
      }

      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
        if (event.state.tab) setStudioTab(event.state.tab);
      } else {
        // Fallback for initial state or external navigation OR if state exists but lacks view info
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const tabParam = params.get('tab');

        if (viewParam) {
          const view = viewParam.toUpperCase() as typeof currentView;
          if (['STUDIO', 'HISTORY', 'PAYMENT', 'PRIVACY', 'BRANDING'].includes(view)) {
            setCurrentView(view);
          } else {
            setCurrentView('STUDIO');
          }
        } else {
          setCurrentView('STUDIO');
        }

        if (tabParam && ['studio', 'fun', 'library'].includes(tabParam)) {
          setStudioTab(tabParam as any);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showTopUpModal, showLoginModal, showPricingModal]);

  // Initial Load URL Check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const tabParam = params.get('tab');

    if (viewParam) {
      const view = viewParam.toUpperCase() as typeof currentView;
      if (['STUDIO', 'HISTORY', 'PAYMENT', 'PRIVACY', 'BRANDING'].includes(view)) {
        setCurrentView(view);
      }
    }

    if (tabParam && ['studio', 'fun', 'library'].includes(tabParam)) {
      setStudioTab(tabParam as any);
    }

    if (!viewParam && !tabParam) {
      // Set initial state without pushing to history
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'studio');
      url.searchParams.set('tab', 'studio');
      window.history.replaceState({ view: 'STUDIO', tab: 'studio' }, '', url.toString());
    }
  }, []);

  const initializeUser = async (user: any) => {
    try {
      let profile = await createProfileIfNotExists(user);
      if (profile) {
        setUserProfile(profile);
        const remoteHistory = await fetchHistoryFromDb(user.id);
        setHistory(remoteHistory);
      }
    } catch (err) {
      console.error("Init user failed", err);
    }
  };

  // Fetch transactions when entering Payment view
  useEffect(() => {
    if (currentView === 'PAYMENT' && userProfile) {
      fetchTransactions(userProfile.id).then(data => setTransactions(data));
    }
    // Refresh history when entering History view
    if (currentView === 'HISTORY' && userProfile) {
      fetchHistoryFromDb(userProfile.id).then(data => setHistory(data));
    }
  }, [currentView, userProfile]);

  const handleLogin = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      setShowLoginModal(false);
    } catch (e: any) {
      setError("Login failed. Check Supabase URL settings.");
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setUserProfile(null);
    setHistory([]);
    setResults([]);
    navigateTo('STUDIO');
    setShowLoginModal(false);
  };

  useEffect(() => {
    if (!isGenerating && results.length > 0 && window.innerWidth < 1024 && currentView === 'STUDIO') {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isGenerating, results, currentView]);

  useEffect(() => {
    const numericAmount = parseInt(topUpAmount.replace(/\D/g, '') || '0');
    setCalculatedCoins(Math.floor(numericAmount / 1000));
  }, [topUpAmount]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- COST CALCULATION ---
  const getCostPerImage = () => {
    let cost = 0;
    if (selectedModel.includes('flash')) {
      cost = 5;
    } else {
      // Pro Model Pricing (Fixed)
      cost = 25;
    }

    if (accessoryImages.length > 0) cost += (accessoryImages.length * 3);
    return cost;
  };

  const getTotalCost = () => {
    return getCostPerImage() * numberOfImages;
  };

  // Helper function to show error modal with appropriate message
  const showErrorModal = (errorMessage: string) => {
    // Extract error code if present (e.g., "500", "503", "404")
    const codeMatch = errorMessage.match(/\b(4\d{2}|5\d{2})\b/);
    const errorCode = codeMatch ? codeMatch[1] : undefined;

    // Check for image safety/content related errors
    if (errorMessage.includes("IMAGE_OTHER") ||
      errorMessage.includes("IMAGE_SAFETY") ||
      errorMessage.includes("IMAGE_CONTENT_BLOCKED") ||
      errorMessage.includes("SAFETY_VIOLATION") ||
      errorMessage.includes("PROHIBITED") ||
      errorMessage.includes("blocked") ||
      errorMessage.toLowerCase().includes("safety") ||
      errorMessage.toLowerCase().includes("refused") ||
      errorMessage.toLowerCase().includes("content")) {
      setErrorModal({
        message: "Hình Ảnh Quá Nhạy Cảm hoặc Không Phù Hợp, vui lòng thử lại ảnh khác hoặc thêm mô tả chi tiết.",
        code: "CONTENT"
      });
    } else if (errorMessage.includes("500") || errorMessage.toLowerCase().includes("fetch") || errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("timeout")) {
      setErrorModal({ message: "Kết nối yếu, vui lòng thử lại", code: "500" });
    } else {
      setErrorModal({
        message: "Hệ Thống Bị Gián Đoạn, Xin Vui Lòng Thử Lại Sau",
        code: errorCode
      });
    }
  };

  const handleGenerate = async () => {
    setError(null);

    if (!session || !userProfile) {
      setShowLoginModal(true);
      return;
    }

    const cost = getTotalCost();
    if (userProfile.credits < cost) {
      setShowPricingModal(true);
      setError(`Insufficient balance. Cost: ${cost} xu, Available: ${userProfile.credits} xu.`);
      return;
    }

    if (mode === AppMode.CREATIVE_POSE && !primaryImage) { setError("Please upload Source Photo."); return; }
    if (mode === AppMode.CREATE_MODEL && !primaryImage && !randomFace) { setError("Please upload Outfit Reference or enable Randomize Model."); return; }
    if ((mode === AppMode.VIRTUAL_TRY_ON || mode === AppMode.COPY_CONCEPT) && (!primaryImage || !secondaryImage)) {
      setError("Please upload both required images.");
      return;
    }
    if (mode === AppMode.FUN_FREEDOM && !primaryImage && !secondaryImage && accessoryImages.length === 0 && !prompt) {
      setError("Please upload at least one image or provide a prompt for Freedom Mode.");
      return;
    }


    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) { setError("API key required."); return; }
    } catch (e) { setError("Failed to init API."); return; }

    setIsGenerating(true);
    setResults([]);
    setSelectedResultIndex(0);
    setLoadingState({ title: "Dreaming...", subtitle: `Spending ${cost} credits...` });

    if (window.innerWidth < 1024) setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);

    const maxRetries = 2;
    let attempt = 0;
    let success = false;
    let generatedBatch: string[] = [];

    while (attempt <= maxRetries && !success) {
      try {
        generatedBatch = await generateStudioImage({
          mode,
          modelName: selectedModel,
          primaryImage: primaryImage,
          secondaryImage: (mode === AppMode.CREATIVE_POSE || mode === AppMode.CREATE_MODEL) ? null : secondaryImage,
          userPrompt: prompt,
          aspectRatio,
          flexibleMode,
          randomFace,
          numberOfImages,
          accessoryImages: accessoryImages,
          backgroundImage: null,
          onImageGenerated: (url) => { setResults(prev => [...prev, url]); }
        });
        success = true;
      } catch (err: any) {
        const errorMsg = err.message || "";
        // Only use safetyWarning modal for account bans (which have serious implications)
        if (errorMsg.includes("ACCOUNT_BANNED")) {
          setSafetyWarning(errorMsg);
          break;
        }
        // Use showErrorModal for content/safety related errors with user-friendly message
        if (errorMsg.includes("SAFETY_VIOLATION") ||
          errorMsg.includes("IMAGE_CONTENT_BLOCKED") ||
          errorMsg.includes("CONTENT_BLOCKED") ||
          errorMsg.includes("IMAGE_OTHER") ||
          errorMsg.includes("IMAGE_SAFETY") ||
          errorMsg.includes("PROHIBITED") ||
          errorMsg.includes("blocked") ||
          errorMsg.includes("content") ||
          errorMsg.includes("refused")) {
          showErrorModal(errorMsg);
          break;
        }
        if (attempt === maxRetries) { showErrorModal(err.message || "Something went wrong."); break; }

        // Only retry on 500 errors or network errors
        const isRetryable = err.message?.includes("500") ||
          err.message?.includes("fetch") ||
          err.message?.includes("network") ||
          err.message?.includes("timeout") ||
          err.message?.includes("connection");

        if (!isRetryable) {
          showErrorModal(err.message || "Generation failed.");
          break;
        }

        attempt++;
        if (attempt === 1) {
          setResults([]);
          setLoadingState({ title: "Connection Instability", subtitle: "Retrying in 2..." });
          await wait(1000);
          setLoadingState({ title: "Connection Instability", subtitle: "Retrying in 1..." });
          await wait(1000);
          setLoadingState({ title: "Retrying...", subtitle: "Re-establishing connection..." });
        } else if (attempt === 2) {
          setResults([]);
          setLoadingState({ title: "Retrying...", subtitle: "Final attempt..." });
        }
      }
    }

    if (success && generatedBatch.length > 0) {
      // Calculate actual cost based on successfully generated images, not requested amount
      const actualCost = getCostPerImage() * generatedBatch.length;

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        thumbnail: generatedBatch[0],
        images: generatedBatch,
        prompt: prompt || "Generated Image",
        timestamp: Date.now(),
        mode,
        modelName: selectedModel,
        cost: actualCost
      };

      setHistory(prev => [newItem, ...prev]);
      const newBalance = userProfile.credits - actualCost;
      setUserProfile({ ...userProfile, credits: newBalance });
      setIsSyncing(true);

      await updateUserCredits(userProfile.id, newBalance);

      const imageType = (mode === AppMode.FUN_FREEDOM) ? 'STANDARD' : (getCostPerImage() > 5 ? 'PREMIUM' : 'STANDARD');
      saveGenerationToDb(userProfile.id, newItem, cost, imageType).then(savedItem => {
        if (savedItem) {
          setHistory(prev => prev.map(h => h.id === newItem.id ? savedItem : h));
        }
        setIsSyncing(false);
      }).catch(() => setIsSyncing(false));
    }

    // Reset viewing history state and show new results when generation completes
    if (viewingHistoryDuringGeneration && generatedBatch.length > 0) {
      setResults(generatedBatch);
      setSelectedResultIndex(0);
    }
    setViewingHistoryDuringGeneration(false);
    setIsGenerating(false);
  };

  const handleNewPose = () => {
    if (results.length > 0) {
      const currentImage = results[selectedResultIndex];
      setMode(AppMode.CREATIVE_POSE);
      setPrimaryImage(currentImage);
      setSecondaryImage(null);
      setNumberOfImages(1);

      // Scroll to left panel (top) on mobile - same approach as generate scroll
      if (window.innerWidth < 1024) {
        setTimeout(() => {
          leftPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  };

  // Reset all studio settings to default
  const handleResetStudio = () => {
    setMode(AppMode.CREATIVE_POSE);
    setPrimaryImage(null);
    setSecondaryImage(null);
    setPrompt('');
    setAspectRatio('3:4' as AspectRatio);
    setFlexibleMode(false);
    setRandomFace(false);
    setNumberOfImages(1);
    setSelectedModel('gemini-2.5-flash-image');
    setAccessoryImages([]);
    setResults([]);
    setSelectedResultIndex(0);
    setDisplayImage(null);
    setError(null);
    setStudioTab('studio');
  };

  const handleUpscale = () => {
    if (results.length === 0) return;
    setShowUpscaleModal(true);
  };

  const confirmUpscale = async (resolution: '2K' | '4K') => {
    setShowUpscaleModal(false);
    if (results.length === 0) return;

    const cost = resolution === '4K' ? 50 : 20;

    if (!session || !userProfile) {
      setShowLoginModal(true);
      return;
    }

    if (userProfile.credits < cost) {
      setShowPricingModal(true);
      setError(`Insufficient balance. Cost: ${cost} xu, Available: ${userProfile.credits} xu.`);
      return;
    }

    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const imageToUpscale = results[selectedResultIndex] || results[0];
    setLoadingState({ title: 'Upscaling...', subtitle: `Enhancing to ${resolution} resolution (-${cost} xu)` });
    setIsGenerating(true);

    try {
      const upscaledImages = await generateStudioImage({
        mode: mode,
        modelName: 'upscale-4k',
        primaryImage: imageToUpscale,
        secondaryImage: null,
        userPrompt: prompt,
        aspectRatio: aspectRatio,
        accessoryImages: accessoryImages,
        numberOfImages: 1,
        targetResolution: resolution
      });

      if (upscaledImages && upscaledImages.length > 0) {
        setResults(prev => [...prev, ...upscaledImages]);
        setSelectedResultIndex(results.length);

        // Deduct credits
        const newBalance = userProfile.credits - cost;
        setUserProfile({ ...userProfile, credits: newBalance });
        await updateUserCredits(userProfile.id, newBalance);

        // Save to DB & R2
        if (userProfile) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            thumbnail: upscaledImages[0],
            images: upscaledImages,
            prompt: `Upscaled ${resolution} Image`,
            timestamp: Date.now(),
            mode: mode,
            modelName: 'upscale-4k',
            cost: cost
          };

          setHistory(prev => [newItem, ...prev]);

          // Background save
          const imageType = resolution === '4K' ? 'SCALE4' : 'SCALE2';
          saveGenerationToDb(userProfile.id, newItem, cost, imageType).then(savedItem => {
            if (savedItem) {
              setHistory(prev => prev.map(h => h.id === newItem.id ? savedItem : h));
            }
          });
        }
      }
    } catch (error: any) {
      console.error("Upscale failed:", error);
      const errorMsg = error.message || "";
      if (errorMsg.includes("SAFETY_VIOLATION") ||
        errorMsg.includes("ACCOUNT_BANNED") ||
        errorMsg.includes("PROHIBITED") ||
        errorMsg.includes("blocked") ||
        errorMsg.includes("content")) {
        setSafetyWarning(errorMsg);
      } else {
        setToast({ message: "Upscale failed: " + (error instanceof Error ? error.message : String(error)), type: 'error' });
      }
    } finally {
      setIsGenerating(false);
      setLoadingState({ title: 'Generating...', subtitle: 'Crafting your masterpiece...' });
    }
  };



  const deleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Delete this image?")) {
      setHistory(prev => prev.filter(item => item.id !== id));
      await deleteHistoryFromDb(id);
    }
  };

  const downloadImage = async (imageUrl: string, index = 0, promptText = "", modelNameStr = "") => {
    if (!imageUrl) return;

    // Helper to trigger download via link (Desktop or Fallback)
    const triggerDownloadLink = (url: string) => {
      const link = document.createElement('a');
      link.href = url;
      const sanitizedPrompt = promptText ? promptText.trim().replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').substring(0, 40) : "";
      const modelToUse = modelNameStr || selectedModel;
      const modelTag = modelToUse.includes('flash') ? 'flash' : 'pro';
      link.download = `windistudio_${modelTag}_${sanitizedPrompt || 'art'}_${Date.now()}_${index}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Helper to handle Blob (Share or Download)
    const handleBlob = async (blob: Blob) => {
      // Web Share API removed as per user request to force direct download


      // Fallback: Create Blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      triggerDownloadLink(blobUrl);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    };

    const isBase64 = imageUrl.startsWith('data:');

    // --- WATERMARK LOGIC START ---
    const applyWatermark = async (sourceUrl: string): Promise<Blob | null> => {
      if (!brandingLogo || !brandingConfig) return null;

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = sourceUrl;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Draw Base
        ctx.drawImage(img, 0, 0);

        // Draw Logo
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.src = brandingLogo;
        await logo.decode();

        const scale = brandingConfig.scale || 0.2;
        const logoW = img.width * scale;
        const logoH = logoW * (logo.height / logo.width);
        const posXPercent = brandingConfig.x !== undefined ? brandingConfig.x : 90;
        const posYPercent = brandingConfig.y !== undefined ? brandingConfig.y : 90;

        ctx.globalAlpha = brandingConfig.opacity || 1.0;

        if (brandingConfig.layoutMode === 'loop') {
          const yPos = (img.height * posYPercent) / 100 - (logoH / 2);
          const gap = brandingConfig.gap || 10;
          let currentX = 0;
          while (currentX < img.width) {
            ctx.drawImage(logo, currentX, yPos, logoW, logoH);
            currentX += logoW + gap;
          }
        } else {
          const xPos = (img.width * posXPercent) / 100 - (logoW / 2);
          const yPos = (img.height * posYPercent) / 100 - (logoH / 2);
          ctx.drawImage(logo, xPos, yPos, logoW, logoH);
        }

        ctx.globalAlpha = 1.0;

        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      } catch (e) {
        console.error("Failed to apply watermark", e);
        return null;
      }
    };
    // --- WATERMARK LOGIC END ---

    if (isBase64) {
      // Convert Base64 to Blob
      let blob: Blob;

      // Try to apply watermark first
      const watermarkedBlob = await applyWatermark(imageUrl);
      if (watermarkedBlob) {
        blob = watermarkedBlob;
      } else {
        // Fallback to original
        const byteCharacters = atob(imageUrl.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/jpeg' });
      }

      await handleBlob(blob);
    } else {
      // It's a URL (Supabase or R2)
      try {
        // Try to apply watermark first
        const watermarkedBlob = await applyWatermark(imageUrl);
        if (watermarkedBlob) {
          await handleBlob(watermarkedBlob);
        } else {
          // Fallback to original fetch
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          await handleBlob(blob);
        }
      } catch (error) {
        console.error("Download failed:", error);
        // Fallback to direct link if fetch fails (CORS etc)
        triggerDownloadLink(imageUrl);
      }
    }
  };


  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);

  // Listen for transaction updates (Realtime Payment)
  useEffect(() => {
    if (!currentTransactionId) return;

    const channel = supabase
      .channel('transaction-update')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${currentTransactionId}`
        },
        (payload) => {
          console.log('Transaction updated:', payload);
          if (payload.new.status === 'SUCCESS') {
            // Backend webhook now handles all bonus calculation and credit updates
            // Just show success message with the credits_added from the payload
            const creditsAdded = payload.new.credits_added;

            setToast({ message: `Payment successful! +${creditsAdded} xu`, type: 'success' });
            setShowTopUpModal(false);
            setShowPricingModal(false);
            setTopUpStep('INPUT');
            setTopUpAmount('');
            setCurrentTransactionId(null);

            // Refresh profile to get updated balance
            if (userProfile) {
              getProfile(userProfile.id).then(p => {
                if (p) setUserProfile(p);
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime Subscription Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTransactionId, userProfile]);

  const handleTopUpNext = async () => {
    if (topUpStep === 'INPUT') {
      if (!topUpAmount || parseInt(topUpAmount) < 10000) {
        alert("Minimum amount is 10,000 VND");
        return;
      }

      // Create PENDING transaction immediately
      if (userProfile) {
        const tx = await createTransaction(
          userProfile.id,
          parseInt(topUpAmount),
          calculatedCoins,
          `Payment: WINDI ${userProfile.payment_code}`,
          'PENDING'
        );
        if (tx) {
          setCurrentTransactionId(tx.id);
        }
      }

      const link = `https://img.vietqr.io/image/${BANK_CONFIG.BANK_ID}-${BANK_CONFIG.ACCOUNT_NO}-${BANK_CONFIG.TEMPLATE}.png?amount=${topUpAmount}&addInfo=WINDI ${userProfile?.payment_code}&accountName=${encodeURIComponent(BANK_CONFIG.ACCOUNT_NAME)}`;
      setQrUrl(link);
      setTopUpStep('QR');
    } else {
      // Manual check (fallback)
      // User clicked "I have transferred" but we prefer auto-check.
      // We can keep this as a "Refresh" button or remove it.
      // For now, let's make it just close the modal if they insist, but warn them.
      if (window.confirm("System is checking automatically. Are you sure you want to close?")) {
        setShowTopUpModal(false);
        setTopUpStep('INPUT');
      }
    }
  };

  // Listen for realtime balance updates
  useEffect(() => {
    if (userProfile) {
      const channel = supabase
        .channel('balance-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userProfile.id}`
          },
          (payload) => {
            const newProfile = payload.new as UserProfile;
            if (newProfile.credits > userProfile.credits) {
              const added = newProfile.credits - userProfile.credits;
              alert(`Received ${added} xu successfully!`);
            }
            setUserProfile(newProfile);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userProfile?.id]); // Re-sub if ID changes (rare)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: show toast
    alert("Copied to clipboard!");
  };

  // --- RENDER HELPERS ---

  const ModeButton = ({ active, icon: Icon, label, onClick }: any) => (
    <button onClick={onClick} className={`relative group p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 glass-button ${active ? 'glass-button-active' : 'text-gray-400 hover:text-white'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-glass-inset ${active ? 'bg-mystic-accent text-white shadow-glow' : 'bg-black/20 text-gray-500 group-hover:text-white'}`}>
        <Icon size={18} />
      </div>
      <span className={`text-xs font-semibold tracking-wide ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
      {active && <div className="absolute inset-x-4 bottom-0 h-0.5 bg-mystic-accent shadow-[0_0_10px_#8b5cf6]" />}
    </button>
  );

  const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`glass-panel ${className || ''}`}>{children}</div>
  );

  // --- VIEWS ---

  // 1. PAYMENT HISTORY VIEW
  const renderPaymentPage = () => (
    <div className="w-full h-full p-6 lg:p-10 flex flex-col max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigateTo('STUDIO')} className="glass-button p-2 rounded-full text-white hover:text-mystic-accent"><ArrowLeft size={24} /></button>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Payment History</h1>
      </div>

      <GlassCard className="flex-1 overflow-hidden rounded-[24px] flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase font-bold text-gray-300">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Transaction Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Coins</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No transactions found.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Calendar size={14} className="text-mystic-accent" />
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${tx.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-white">{tx.amount_vnd.toLocaleString()} VND</td>
                    <td className="px-6 py-4 text-yellow-400 font-bold">+{tx.credits_added} xu</td>
                    <td className="px-6 py-4">
                      {tx.status === 'SUCCESS' ? <CheckCircle size={16} className="text-green-500" /> : <XOctagon size={16} className="text-red-500" />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );

  // 2. IMAGE HISTORY VIEW
  const renderHistoryPage = () => (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto custom-scrollbar">
      <div className="w-full p-6 lg:p-10 flex flex-col max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigateTo('STUDIO')} className="glass-button p-2 rounded-full text-white hover:text-mystic-accent"><ArrowLeft size={24} /></button>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Image History</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
          {history.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500">No images generated yet.</div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="glass-panel rounded-[24px] overflow-hidden group flex flex-col">
                <div className="relative aspect-[3/4] bg-black overflow-hidden">
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none">
                    <div className="flex justify-end gap-2">
                      <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all pointer-events-auto"><Trash2 size={16} /></button>
                      <button onClick={() => downloadImage(item.thumbnail, 0, item.prompt, item.modelName)} className="p-2 rounded-full bg-white/20 text-white hover:bg-mystic-accent transition-all pointer-events-auto"><Download size={16} /></button>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gray-300 uppercase">
                    {item.modelName ? (item.modelName.includes('flash') ? 'AIR' : 'PRO') : 'AI'}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    <span>{item.mode.replace('_', ' ')}</span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-black/20 border border-white/5">
                    <p className="text-xs text-gray-300 line-clamp-4 italic">
                      "{item.prompt}"
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // 3. STUDIO VIEW (Main App)
  const renderStudio = () => {
    let primaryLabel = "1. Source Image";
    let primarySubLabel = "Image to Re-Pose";
    let showSecondary = false;
    let secondaryLabel = "2. Secondary Image";
    let secondarySubLabel = "Reference";

    if (mode === AppMode.VIRTUAL_TRY_ON) {
      primaryLabel = "1. Target Person"; primarySubLabel = "Person to dress"; showSecondary = true; secondaryLabel = "2. Outfit (Required)"; secondarySubLabel = "Clothing Reference";
    } else if (mode === AppMode.CREATE_MODEL) {
      primaryLabel = "1. Outfit Reference"; primarySubLabel = "Clothing to model"; showSecondary = false;
    } else if (mode === AppMode.COPY_CONCEPT) {
      primaryLabel = "1. Your Face"; primarySubLabel = "Face Identity"; showSecondary = true; secondaryLabel = "2. Concept / Outfit"; secondarySubLabel = "Scene & Clothes to Copy";
    }

    const isGenerateDisabled = isGenerating ||
      (studioTab === 'studio' && (
        (mode === AppMode.CREATIVE_POSE && !primaryImage) ||
        (mode === AppMode.CREATE_MODEL && !primaryImage && !randomFace) ||
        ((mode === AppMode.VIRTUAL_TRY_ON || mode === AppMode.COPY_CONCEPT) && (!primaryImage || !secondaryImage))
      )) ||
      (studioTab === 'fun' && !primaryImage && !secondaryImage && accessoryImages.length === 0 && !prompt);

    // Handle Tab Side Effects (Moved to top level)



    return (
      <div className="flex-1 flex flex-col w-full min-h-0">
        {/* TABS HIDDEN FOR NOW - Uncomment to re-enable */}
        {/* <StudioTabs activeTab={studioTab} onTabChange={(tab) => navigateTo('STUDIO', false, tab)} /> */}

        {studioTab === 'library' ? (
          <div className="flex-1 p-6 lg:p-10 overflow-hidden">
            <LibraryView
              onSelectImage={(url) => {
                setPrimaryImage(url);
                setMode(AppMode.CREATIVE_POSE);
                setStudioTab('studio');
                setToast({ message: "Image selected as Pose", type: 'success' });
              }}
              onClose={() => setStudioTab('studio')}
              isAdmin={isAdmin}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row relative overflow-auto lg:overflow-hidden">
            {/* LEFT PANEL */}
            <div ref={leftPanelRef} className="w-full lg:w-[380px] xl:w-[420px] flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 bg-black/10 backdrop-blur-sm z-10 h-auto lg:h-full shrink-0">
              <div className="p-4 lg:p-5 flex-1 overflow-y-auto custom-scrollbar">

                {/* Mode Selection - Only show in Studio tab */}
                {studioTab === 'studio' && (
                  <div className="mb-6">
                    <div className="glass-panel p-1.5 rounded-[24px] grid grid-cols-3 gap-1.5 shrink-0">
                      <ModeButton active={mode === AppMode.CREATIVE_POSE} icon={Camera} label="Pose" onClick={() => setMode(AppMode.CREATIVE_POSE)} />
                      <ModeButton active={mode === AppMode.VIRTUAL_TRY_ON} icon={Shirt} label="Try-On" onClick={() => setMode(AppMode.VIRTUAL_TRY_ON)} />
                      <ModeButton active={mode === AppMode.CREATE_MODEL} icon={User} label="Model" onClick={() => setMode(AppMode.CREATE_MODEL)} />
                    </div>
                  </div>
                )}

                {/* FUN MODE: Freedom Input */}
                {studioTab === 'fun' && (
                  <div className="mb-6">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-3">
                      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2"><Sparkles size={14} className="text-pink-400" /> Freedom Mode</h3>
                      <p className="text-xs text-gray-400">Upload multiple reference images and describe exactly what you want. No templates, pure creativity.</p>
                    </div>

                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Reference Images</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Reuse Accessory Images for multiple uploads in Fun mode for simplicity, or we can use primary/secondary + accessory */}
                      <ImageUploader
                        label="Image 1"
                        image={primaryImage}
                        onImageChange={setPrimaryImage}
                      />
                      <ImageUploader
                        label="Image 2"
                        image={secondaryImage}
                        onImageChange={setSecondaryImage}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">More References</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="aspect-square relative rounded-lg border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center hover:border-white/30 transition-colors">
                            {accessoryImages[idx] ? (
                              <>
                                <img src={accessoryImages[idx]} alt="" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => {
                                    const newAcc = [...accessoryImages];
                                    newAcc.splice(idx, 1);
                                    setAccessoryImages(newAcc);
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                                >
                                  <X size={10} />
                                </button>
                              </>
                            ) : (
                              <label className="cursor-pointer w-full h-full flex items-center justify-center text-gray-500 hover:text-white transition-colors">
                                <Plus size={16} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      const reader = new FileReader();
                                      reader.onload = (ev) => {
                                        if (ev.target?.result) {
                                          setAccessoryImages([...accessoryImages, ev.target.result as string]);
                                        }
                                      };
                                      reader.readAsDataURL(e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inputs based on Mode (Studio Only) */}
                {studioTab === 'studio' && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={!showSecondary ? "col-span-2 w-1/2 mx-auto" : "col-span-1"}>
                      <ImageUploader label={primaryLabel} subLabel={primarySubLabel} image={primaryImage} onImageChange={setPrimaryImage} />
                    </div>
                    {showSecondary && <div className="col-span-1"><ImageUploader label={secondaryLabel} subLabel={secondarySubLabel} image={secondaryImage} onImageChange={setSecondaryImage} /></div>}
                  </div>
                )}

                {/* Common controls for both Studio and Fun tabs */}
                <button onClick={handleGenerate} disabled={isGenerateDisabled} className={`w-full py-3 rounded-[20px] font-bold text-base tracking-wide text-white shadow-liquid shrink-0 liquid-btn-style transition-all duration-500 transform ${isGenerateDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}`}>
                  <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                    {isGenerating ? <><RefreshCw className="animate-spin" size={18} />{loadingState.title === "Upscaling..." ? "Upscaling..." : loadingState.title === "Dreaming..." ? "Synthesizing..." : "Retrying..."}</> : <><Sparkles size={18} className="fill-white" />GENERATE {getTotalCost() > 0 && (<div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5 ml-1"><span className="text-sm font-extrabold text-yellow-300">{getTotalCost()}</span><Coins size={14} className="text-yellow-400 fill-yellow-400" /></div>)}</>}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="glass-panel p-2 rounded-[20px] flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase ml-1"><Zap size={10} className="text-purple-400" />Processing Model</div>
                    <div className="flex bg-black/20 rounded-xl p-1 gap-1">
                      <button onClick={() => { setSelectedModel('gemini-2.5-flash-image'); setAccessoryImages([]); }} className={`relative flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        {mode === AppMode.CREATIVE_POSE && <Star size={14} className="absolute -top-1.5 -left-1.5 text-yellow-400 fill-yellow-400 rotate-[45deg]" />}
                        Air
                      </button>
                      <button onClick={() => setSelectedModel('gemini-3-pro-image-preview')} className={`relative flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-indigo-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        {(mode === AppMode.VIRTUAL_TRY_ON || mode === AppMode.CREATE_MODEL) && <Star size={14} className="absolute -top-1.5 -right-1.5 text-yellow-400 fill-yellow-400 rotate-[-45deg]" />}
                        Pro
                      </button>
                    </div>
                  </div>
                  <div className="glass-panel p-2 rounded-[20px] flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase ml-1"><Layers size={10} className="text-mystic-accent" />Số lượng ảnh</div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((num) => (
                        <button key={num} onClick={() => setNumberOfImages(num)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${numberOfImages === num ? 'bg-mystic-accent border-mystic-accent text-white shadow-glow' : 'bg-black/20 border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}>{num}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-[24px] space-y-4 mt-4">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Layers size={14} className="text-mystic-accent" /> Configuration</span>
                    <button className="p-1.5 rounded-full hover:bg-white/5 transition-colors">{showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                  </div>
                  {showAdvanced && (
                    <div className="space-y-5 pt-2 animate-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1">Mô tả chi tiết</label>
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., Cyberpunk background..." className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-mystic-accent focus:bg-black/40 transition-all resize-none shadow-inner h-20" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1.5 block">Tỉ lệ</label>
                          <div className="relative">
                            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:border-mystic-accent outline-none">
                              {Object.values(AspectRatio).map(ratio => (<option key={ratio} value={ratio} className="bg-mystic-900 text-white">{ratio}</option>))}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1.5 block">Ảnh Phụ Kiện, Background (+3 xu/ảnh)</label>
                          <div className="grid grid-cols-3 gap-2">
                            {accessoryImages.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                                <img src={img} alt={`Accessory ${idx}`} className="w-full h-full object-cover" />
                                <button onClick={() => setAccessoryImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><X size={12} /></button>
                              </div>
                            ))}
                            {accessoryImages.length < 3 && (
                              <label
                                className="aspect-square rounded-lg border border-white/10 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors gap-1"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.add('bg-white/10', 'border-mystic-accent');
                                }}
                                onDragLeave={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.remove('bg-white/10', 'border-mystic-accent');
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.currentTarget.classList.remove('bg-white/10', 'border-mystic-accent');
                                  const file = e.dataTransfer.files?.[0];
                                  if (file && file.type.startsWith('image/')) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setAccessoryImages(prev => [...prev, reader.result as string]);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              >
                                <Plus size={16} className="text-gray-500" />
                                <span className="text-[9px] text-gray-500">Add</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setAccessoryImages(prev => [...prev, reader.result as string]);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                              </label>
                            )}
                          </div>
                        </div>

                      </div>

                      <div className="space-y-2 pt-1">
                        {(mode !== AppMode.CREATIVE_POSE && mode !== AppMode.CREATE_MODEL && mode !== AppMode.VIRTUAL_TRY_ON) && (
                          <button onClick={() => setFlexibleMode(!flexibleMode)} className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${flexibleMode ? 'bg-mystic-accent/10 border-mystic-accent text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'}`}>
                            <div className="flex items-center gap-2"><Shuffle size={14} /><span className="text-xs font-medium">Creative Freedom</span></div>
                            {flexibleMode ? <ToggleRight className="text-mystic-accent" size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        )}
                        {(mode === AppMode.CREATE_MODEL) && (
                          <button onClick={() => setRandomFace(!randomFace)} className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${randomFace ? 'bg-pink-500/10 border-pink-500 text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'}`}>
                            <div className="flex items-center gap-2"><ScanFace size={14} /><span className="text-xs font-medium">Randomize Model</span></div>
                            {randomFace ? <ToggleRight className="text-pink-500" size={20} /> : <ToggleLeft size={20} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {error && <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl flex items-start gap-3 text-red-200 animate-in fade-in slide-in-from-top-2 shrink-0"><AlertCircle className="shrink-0 mt-0.5" size={18} /><p className="text-sm leading-relaxed">{error}</p></div>}
              </div>
            </div>

            {/* MIDDLE PANEL - OUTPUT */}
            <div ref={outputRef} className="w-full lg:w-auto lg:flex-1 h-[70vh] lg:h-full bg-black/50 relative flex flex-col p-4 lg:p-6 lg:overflow-hidden shrink-0 lg:shrink lg:min-w-0 transition-all">
              <GlassCard className="flex-1 w-full h-full relative group overflow-hidden flex flex-col rounded-[24px] lg:rounded-[32px] border-white/10 shadow-2xl">
                {isGenerating && !viewingHistoryDuringGeneration && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-50 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-4 border-mystic-accent/30 rounded-full animate-ping" />
                      <div className="absolute inset-2 border-4 border-t-mystic-accent border-r-transparent border-b-pink-500 border-l-transparent rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="text-white animate-pulse" size={24} /></div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-mystic-accent to-pink-500 animate-pulse">{loadingState.title}</p>
                      <p className="text-gray-400 text-xs tracking-wide">{loadingState.subtitle}</p>
                    </div>
                  </div>
                )}

                {results.length > 0 ? (
                  <>
                    <div className="flex-1 w-full h-full relative">
                      <ImageViewer originalImage={primaryImage} resultImage={displayImage || results[selectedResultIndex] || results[0]} />
                      <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
                        <button onClick={() => downloadImage(results[selectedResultIndex], selectedResultIndex, prompt, selectedModel)} className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-mystic-accent transition-all group shadow-glass" title="Save Image"><Download size={22} className="group-hover:translate-y-0.5 transition-transform" /></button>
                        <button onClick={handleNewPose} className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-pink-400 transition-all shadow-glass" title="Use as Pose"><Bone size={22} /></button>
                        <button onClick={handleUpscale} className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-purple-400 transition-all shadow-glass" title="Upscale 4K"><Maximize2 size={22} /></button>

                      </div>
                      {/* Mobile Hint */}
                      <div className="lg:hidden absolute bottom-4 left-0 right-0 text-center pointer-events-none z-20">
                        <span className="text-[10px] text-white/50 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Long press image to save to Photos</span>
                      </div>
                    </div>
                    {results.length > 1 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col gap-3 shadow-2xl">
                        {results.map((img, idx) => (
                          <button key={idx} onClick={() => setSelectedResultIndex(idx)} className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${selectedResultIndex === idx ? 'border-mystic-accent scale-110 shadow-glow' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}>
                            <img src={img} alt="" className="w-full h-full object-contain bg-black/80" />
                          </button>
                        ))}
                        {isGenerating && results.length < numberOfImages && (<div className="w-16 h-16 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center animate-pulse"><RefreshCw className="animate-spin text-gray-500" size={20} /></div>)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto opacity-50 p-6">
                    <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center border border-white/10 shadow-glass-inset"><ImageIcon className="text-gray-500" size={32} /></div>
                    <div className="space-y-1"><h3 className="text-lg font-medium text-white">Your Canvas is Empty</h3><p className="text-xs text-gray-400">Upload references and ignite the engine.</p></div>
                  </div>
                )}
              </GlassCard>
            </div >

            {/* RIGHT PANEL - SIDEBAR HISTORY */}
            < div className={`fixed inset-0 lg:static lg:inset-auto z-40 bg-black/95 lg:bg-black/10 lg:backdrop-blur-sm lg:border-l border-white/10 flex flex-col w-full lg:w-[280px] xl:w-[320px] transition-transform duration-300 shrink-0 lg:h-full lg:overflow-hidden ${showMobileHistory ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
              <div className="p-4 lg:p-5 border-b border-white/5 flex justify-between items-center bg-black/20 lg:bg-transparent shrink-0">
                <button onClick={() => navigateTo('HISTORY')} className="text-xs font-bold flex items-center gap-2 text-white uppercase tracking-widest cursor-pointer transition-all bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-4 py-2 shadow-sm hover:border-mystic-accent/50 hover:shadow-glow group">
                  <History size={14} className="text-mystic-accent group-hover:scale-110 transition-transform" />
                  Recent
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowMobileHistory(false)} className="lg:hidden p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors"><XCircle size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
                <div className="grid grid-cols-2 gap-3">
                  {history.length === 0 ? (
                    <div className="col-span-2 h-40 flex flex-col items-center justify-center text-gray-600 gap-2"><History size={24} className="opacity-20" /><p className="text-xs">No artifacts yet.</p></div>
                  ) : (
                    history.slice(0, 10).map((item) => ( // Only show recent 10 in sidebar
                      <div key={item.id} className="group relative flex flex-col bg-[#0f0c1d] border border-white/10 rounded-xl overflow-hidden hover:border-mystic-accent/50 transition-all cursor-pointer shadow-lg shrink-0" onClick={() => { setResults(item.images); setSelectedResultIndex(0); setMode(item.mode); setShowMobileHistory(false); if (isGenerating) setViewingHistoryDuringGeneration(true); if (window.innerWidth < 1024) setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
                        <div className="w-full aspect-[3/4] bg-black relative">
                          <img src={item.thumbnail} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute top-2 right-2 p-1 rounded bg-black/50 text-[8px] text-white font-bold pointer-events-none">{item.images.length}</div>

                          {/* Sidebar Actions Overlay - Moved to bottom, removed full dark layer */}
                          <div className="absolute inset-x-0 bottom-0 p-2 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 bg-gradient-to-t from-black/90 to-transparent">
                            <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all backdrop-blur-sm pointer-events-auto"><Trash2 size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); downloadImage(item.thumbnail, 0, item.prompt, item.modelName); }} className="p-1.5 rounded-full bg-white/20 text-white hover:bg-mystic-accent transition-all backdrop-blur-sm pointer-events-auto"><Download size={14} /></button>
                          </div>
                        </div>
                        <div className="p-2 flex flex-col items-center justify-center bg-[#13111c]">
                          <span className="text-[9px] font-medium text-gray-400 tracking-wide">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-full group-hover:text-mystic-accent transition-colors">
                            {item.mode === AppMode.CREATIVE_POSE ? 'Pose' : item.mode === AppMode.VIRTUAL_TRY_ON ? 'Try-On' : item.mode === AppMode.CREATE_MODEL ? 'Model' : 'Concept'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div >
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-black flex flex-col font-sans selection:bg-mystic-accent selection:text-white overflow-y-auto lg:overflow-hidden">

      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-900/10 blur-3xl pointer-events-none" />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`glass-panel px-6 py-3 rounded-full border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-400" />}
            <span className="text-sm font-bold tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <nav className="w-full h-16 lg:h-20 px-6 lg:px-8 flex justify-between items-center shrink-0 bg-black/20 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0 lg:static">
        <div className="relative flex items-center gap-3 cursor-pointer" onClick={handleResetStudio}>

          <div>
            <img src="/textlogo.png" alt="WinDiStudio" className="h-16 object-contain" style={{ marginTop: '12px' }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {session && userProfile ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Clickable Balance Pill */}
              <div onClick={() => setShowPricingModal(true)} className="glass-panel px-4 py-2 rounded-full flex items-center gap-2.5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer shadow-glass-sm group">
                <div className="p-1 rounded-full bg-yellow-500/20 group-hover:scale-110 transition-transform"><Wallet size={14} className="text-yellow-400" /></div>
                <div className="flex flex-col leading-none"><span className="hidden lg:block text-[8px] text-gray-400 font-bold uppercase tracking-wider">Balance</span><span className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">{userProfile.credits} xu</span></div>
              </div>



              <div className="ml-3 pl-4 border-l border-white/10 flex items-center gap-3">
                <div className="text-right hidden lg:block"><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Welcome</p><p className="text-sm font-bold text-white leading-none truncate max-w-[100px]">{userProfile.full_name}</p></div>
                <button onClick={() => { setShowLoginModal(true); window.history.pushState({ loginOpen: true }, ''); }} className="w-10 h-10 rounded-full bg-gradient-to-br from-mystic-accent to-indigo-600 p-0.5 shadow-glow hover:scale-110 transition-transform cursor-pointer">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">{userProfile.avatar_url ? <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User size={18} className="text-white" />}</div>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowLoginModal(true); window.history.pushState({ loginOpen: true }, ''); }} className="flex glass-button px-5 py-2.5 rounded-full items-center gap-2 text-white text-xs font-bold uppercase tracking-wider hover:text-mystic-accent transition-all hover:shadow-glow"><LogIn size={16} /><span className="hidden lg:inline">Đăng Nhập</span></button>
          )}
          {currentView === 'STUDIO' && (
            <button onClick={() => setShowMobileHistory(!showMobileHistory)} className={`lg:hidden p-2.5 rounded-full glass-button text-gray-300 hover:text-white ${showMobileHistory ? 'glass-button-active' : ''}`}><History size={18} /></button>
          )}
        </div>
      </nav>

      {/* VIEW RENDERER */}
      {currentView === 'STUDIO' && renderStudio()}
      {currentView === 'HISTORY' && renderHistoryPage()}
      {currentView === 'PAYMENT' && renderPaymentPage()}
      {currentView === 'PRIVACY' && <PrivacyPolicy onBack={() => navigateTo('STUDIO')} />}
      {/* PRICING MODAL */}
      {showPricingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0f0c1d] border border-white/10 shadow-2xl custom-scrollbar">
            {/* Sticky close button that follows scroll */}
            <div className="sticky top-0 z-20 flex justify-end p-4 bg-gradient-to-b from-[#0f0c1d] via-[#0f0c1d]/90 to-transparent pointer-events-none">
              <button
                onClick={() => setShowPricingModal(false)}
                className="p-2 rounded-full bg-black/50 text-white/50 hover:text-white hover:bg-white/20 transition-all pointer-events-auto"
              >
                <X size={24} />
              </button>
            </div>
            <div className="-mt-16">
              <Pricing
                userProfile={userProfile}
                bankConfig={BANK_CONFIG}
                onTransactionCreated={(id) => setCurrentTransactionId(id)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. BRANDING VIEW */}
      {currentView === 'BRANDING' && (
        <BrandingPage
          brandingLogo={brandingLogo}
          setBrandingLogo={setBrandingLogo}
          brandingConfig={brandingConfig}
          setBrandingConfig={setBrandingConfig}
          isSavingBranding={isSavingBranding}
          handleSaveBranding={handleSaveBranding}
          onBack={() => navigateTo('STUDIO')}
        />
      )}

      {/* Privacy Policy Link (Static Footer) */}
      {currentView !== 'PRIVACY' && (
        <div className="w-full py-6 mt-auto flex flex-col items-center gap-1 z-10 relative">
          <button
            onClick={() => navigateTo('PRIVACY')}
            className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors uppercase tracking-widest font-bold px-2 py-1 rounded"
          >
            Chính Sách Bảo Mật
          </button>
          <span className="text-[9px] text-gray-700 font-medium tracking-wide">Copyright ©2025</span>
        </div>
      )}

      {/* LOGIN/ACCOUNT MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => window.history.back()}>
          <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => window.history.back()} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>



            <div className="p-8 flex flex-col items-center gap-6">
              {!session ? (
                <>
                  <div className="bg-[#1a1625] border border-white/10 p-5 rounded-[32px] max-w-sm w-full text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mystic-accent to-transparent" />
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-glass-inset">
                      <User size={32} className="text-mystic-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                    <p className="text-sm text-gray-400 mb-8">Sign in to sync your gallery and credits across devices.</p>

                    <button onClick={handleLogin} className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow flex items-center justify-center gap-3">
                      <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
                      Continue with Google
                    </button>

                    {/* Dev Login Button */}
                    {import.meta.env.DEV && (
                      <button onClick={() => {
                        const mockUser = { id: 'dev-user', email: 'dev@windistudio.com' };
                        setSession({ user: mockUser });
                        setUserProfile({
                          id: 'dev-user',
                          email: 'dev@windistudio.com',
                          full_name: 'Dev User',
                          avatar_url: '',
                          payment_code: 'DEV123',
                          credits: 10000
                        });
                        setShowLoginModal(false);
                      }} className="w-full mt-3 py-3.5 rounded-xl bg-gray-800 text-white font-bold text-sm tracking-wide hover:bg-gray-700 transition-all flex items-center justify-center gap-3 border border-white/10">
                        <code className="text-xs">{'<DEV />'}</code>
                        Mock Login
                      </button>
                    )}

                    <button onClick={() => window.history.back()} className="mt-4 text-xs text-gray-500 hover:text-white transition-colors">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-300"><User size={16} /></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Ref Code</span>
                        <span className="text-sm font-medium text-white">{userProfile?.payment_code}</span>
                      </div>
                    </div>
                  </div>

                  {/* Promo Code Section */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter Promo Code"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none uppercase"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const code = e.currentTarget.value.trim().toUpperCase();
                          if (!code) return;
                          const btn = e.currentTarget.nextElementSibling as HTMLButtonElement;
                          btn.click();
                        }
                      }}
                    />
                    <button
                      onClick={async (e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        const code = input.value.trim().toUpperCase();
                        if (!code || !userProfile) return;

                        const btn = e.currentTarget;
                        const originalText = btn.innerText;
                        btn.innerText = '...';
                        btn.disabled = true;

                        try {
                          // Layer 1: Get device fingerprint
                          const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
                          const fp = await FingerprintJS.load();
                          const fpResult = await fp.get();
                          const deviceId = fpResult.visitorId;

                          // Layer 2: Get or create localStorage persistent token
                          const LOCAL_TOKEN_KEY = 'windi_device_token';
                          let localToken = localStorage.getItem(LOCAL_TOKEN_KEY);
                          if (!localToken) {
                            // Generate a unique token: timestamp + random string
                            localToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
                            localStorage.setItem(LOCAL_TOKEN_KEY, localToken);
                          }

                          // Layer 3: IP address will be extracted on backend

                          const { redeemPromoCode } = await import('./services/supabaseService');
                          const result = await redeemPromoCode(code, userProfile.id, deviceId, localToken);

                          if (result.success) {
                            setToast({ message: result.message, type: 'success' });
                            setUserProfile(prev => prev ? ({ ...prev, credits: result.new_balance }) : null);
                            input.value = '';
                          } else {
                            setToast({ message: result.message, type: 'error' });
                          }
                        } catch (err) {
                          console.error('Redeem error:', err);
                          setToast({ message: 'Có lỗi xảy ra, vui lòng thử lại', type: 'error' });
                        }

                        btn.innerText = originalText;
                        btn.disabled = false;
                      }}
                      className="shrink-0 bg-mystic-accent hover:bg-mystic-accent/80 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      REDEEM
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { navigateTo('HISTORY'); setShowLoginModal(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all">
                      <ImageIcon size={20} className="text-mystic-accent" />
                      <span className="text-xs font-bold text-gray-300">Image History</span>
                    </button>
                    <button onClick={() => { navigateTo('PAYMENT'); setShowLoginModal(false); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all">
                      <Wallet size={20} className="text-yellow-400" />
                      <span className="text-xs font-bold text-gray-300">Transactions</span>
                    </button>
                  </div>

                  {/* --- BRANDING FEATURE START --- */}
                  <button onClick={() => { navigateTo('BRANDING'); setShowLoginModal(false); }} className="w-full p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-white/10 flex items-center justify-center gap-2 transition-all">
                    <Stamp size={20} className="text-pink-400" />
                    <span className="text-xs font-bold text-gray-200">Branding Kit</span>
                  </button>
                  {/* --- BRANDING FEATURE END --- */}

                  <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }

      {/* SAFETY WARNING MODAL */}
      {safetyWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="w-full max-w-md bg-[#1a1a1a] border border-red-500/50 rounded-3xl p-8 flex flex-col items-center text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <AlertCircle size={40} className="text-red-500" />
            </div>

            <h3 className="text-2xl font-bold text-white">
              {safetyWarning.includes("BANNED") ? "Account Suspended" : "Safety Warning"}
            </h3>

            <p className="text-gray-300 leading-relaxed">
              {safetyWarning.replace("SAFETY_VIOLATION: ", "").replace("ACCOUNT_BANNED: ", "")}
            </p>

            <button
              onClick={() => setSafetyWarning(null)}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {errorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-xs bg-[#1a1a1a] border border-purple-500/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <AlertCircle size={24} className="text-purple-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                {errorModal.code === "CONTENT" ? "Nội Dung Không Phù Hợp" : errorModal.code === "500" ? "Lỗi Kết Nối" : "Lỗi Hệ Thống"}
              </h3>
              <p className="text-sm text-gray-400">
                {errorModal.message}
                {errorModal.code && errorModal.code !== "500" && errorModal.code !== "CONTENT" && (
                  <span className="block mt-1 text-xs text-purple-400">(Error: {errorModal.code})</span>
                )}
              </p>
            </div>

            <button
              onClick={() => setErrorModal(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-all"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* TOP UP MODAL (2-STEP) */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => window.history.back()}>
          <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <button onClick={() => window.history.back()} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>

            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg"><Coins size={20} className="text-black" /></div>
                <div><h2 className="text-lg font-bold text-white">Top Up Credits</h2><p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">1 XU = 1000 VND</p></div>
              </div>

              {/* STEP 1: INPUT */}
              {topUpStep === 'INPUT' && (
                <div className="space-y-4 animate-in slide-in-from-left-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Amount (VND)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="min 50,000" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-all" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex justify-between items-center">
                    <span className="text-xs text-yellow-200/70 font-medium">You will receive:</span>
                    <span className="text-xl font-bold text-yellow-400 drop-shadow-sm">{calculatedCoins} xu</span>
                  </div>
                  <button onClick={handleTopUpNext} disabled={calculatedCoins < 2} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Payment QR
                  </button>
                </div>
              )}

              {/* STEP 2: QR DISPLAY */}
              {topUpStep === 'QR' && userProfile && (
                <div className="space-y-5 animate-in slide-in-from-right-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl shadow-glow">
                      {qrUrl ? <img src={qrUrl} alt="VietQR" className="w-48 h-48 object-contain" /> : <div className="w-48 h-48 flex items-center justify-center"><RefreshCw className="animate-spin text-black" /></div>}
                    </div>
                    <p className="text-xs text-center text-gray-400 max-w-[200px]">Scan with <span className="text-pink-500 font-bold">Momo</span> or any <span className="text-blue-400 font-bold">Banking App</span></p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Transfer Content (Required)</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-yellow-400 font-mono font-bold flex items-center justify-center">WINDI {userProfile.payment_code}</div>
                      <button onClick={() => copyToClipboard(`WINDI ${userProfile.payment_code}`)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"><Copy size={16} /></button>
                    </div>
                  </div>

                  <button onClick={() => window.open(qrUrl, '_blank')} className="w-full py-2.5 rounded-xl bg-pink-600/20 border border-pink-500/30 text-pink-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-pink-600/30 transition-all">
                    <Smartphone size={14} /> Open Banking App / Momo
                  </button>

                  <div className="flex justify-end gap-3 mt-6">
                    <div className="flex items-center gap-3 w-full justify-between">
                      <div className="flex items-center gap-2 text-mystic-accent animate-pulse">
                        <RefreshCw size={16} className="animate-spin" />
                        <span className="text-sm font-medium">Waiting for payment...</span>
                      </div>
                      <button onClick={() => setShowTopUpModal(false)} className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:bg-white/5">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upscale Modal */}
      {showUpscaleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowUpscaleModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="text-purple-400" /> Upscale Image
            </h3>
            <p className="text-white/60 mb-6">Choose your target resolution. Higher resolution requires more credits.</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => confirmUpscale('2K')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 transition-all group"
              >
                <div className="text-2xl font-bold text-white mb-1">2K</div>
                <div className="text-sm text-white/50 group-hover:text-white/80">Standard</div>
                <div className="mt-3 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                  20 xu
                </div>
              </button>

              <button
                onClick={() => confirmUpscale('4K')}
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-500 transition-all group"
              >
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">4K</div>
                <div className="text-sm text-white/50 group-hover:text-white/80">Ultra HD</div>
                <div className="mt-3 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow-lg shadow-purple-500/20">
                  50 xu
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
