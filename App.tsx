import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Shirt, Camera, Wand2, Download, AlertCircle, History, Trash2, ChevronDown, ChevronUp, User, Image as ImageIcon, Bone, Layers, ToggleLeft, ToggleRight, XCircle, Archive, Shuffle, Copy, ScanFace, RefreshCw, LogIn, Coins, X, CreditCard, Wallet, LogOut, Zap } from 'lucide-react';
import JSZip from 'jszip';
import { AppMode, ImageSize, AspectRatio, HistoryItem } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { generateStudioImage, ensureApiKey } from './services/geminiService';

const App: React.FC = () => {
  // Main State
  const [mode, setMode] = useState<AppMode>(AppMode.CREATIVE_POSE);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [secondaryImage, setSecondaryImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>(ImageSize.SIZE_1K);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.PORTRAIT);
  const [numberOfImages, setNumberOfImages] = useState(1);
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');

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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showMobileHistory, setShowMobileHistory] = useState(false); // Only for mobile
  const [isZipping, setIsZipping] = useState(false);

  // User & Billing State
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Default true to show new layout
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [calculatedCoins, setCalculatedCoins] = useState(0);
  const [userBalance, setUserBalance] = useState(100);

  // Refs
  const outputRef = useRef<HTMLDivElement>(null);

  // Reset inputs when mode changes
  useEffect(() => {
    setError(null);
  }, [mode]);

  // Auto-scroll to output on mobile when generation finishes
  useEffect(() => {
    if (!isGenerating && results.length > 0 && window.innerWidth < 1024) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [isGenerating, results]);

  // Calculate coins when top up amount changes
  useEffect(() => {
    const numericAmount = parseInt(topUpAmount.replace(/\D/g, '') || '0');
    setCalculatedCoins(Math.floor(numericAmount / 5000));
  }, [topUpAmount]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerate = async () => {
    setError(null);

    // VALIDATION
    if (mode === AppMode.CREATIVE_POSE && !primaryImage) {
      setError("Please upload your Source Photo for Creative Pose.");
      return;
    }

    if (mode === AppMode.CREATE_MODEL && !primaryImage) {
      setError("Please upload an Outfit Reference for Create Model.");
      return;
    }

    if (mode === AppMode.VIRTUAL_TRY_ON) {
      if (!primaryImage) {
        setError("Please upload a Target Person (Image 1) for Virtual Try-On.");
        return;
      }
      if (!secondaryImage) {
        setError("Please upload an Outfit Reference (Image 2) for Virtual Try-On.");
        return;
      }
    }

    if (mode === AppMode.COPY_CONCEPT) {
      if (!primaryImage) {
        setError("Please upload Your Face (Image 1) for Copy Concept.");
        return;
      }
      if (!secondaryImage) {
        setError("Please upload the Concept/Outfit (Image 2) for Copy Concept.");
        return;
      }
    }

    try {
      const hasKey = await ensureApiKey();
      if (!hasKey) {
        setError("Billing enabled API key required via AI Studio.");
        return;
      }
    } catch (e) {
      setError("Failed to initialize API key selection.");
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setSelectedResultIndex(0);
    setLoadingState({ title: "Dreaming...", subtitle: "Synthesizing pixels with Gemini" });

    // Scroll to output immediately on mobile to show loading state
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    const maxRetries = 2;
    let attempt = 0;
    let success = false;

    while (attempt <= maxRetries && !success) {
      try {
        const generatedImages = await generateStudioImage({
          mode,
          modelName: selectedModel,
          primaryImage: primaryImage,
          secondaryImage: (mode === AppMode.CREATIVE_POSE || mode === AppMode.CREATE_MODEL) ? null : secondaryImage,
          userPrompt: prompt,
          size,
          aspectRatio,
          flexibleMode,
          randomFace,
          numberOfImages,
          onImageGenerated: (url) => {
            // Incrementally update results so user sees images as they arrive
            setResults(prev => [...prev, url]);
          }
        });

        // Note: 'generatedImages' contains the full array returned by the service.
        // Even though we updated state incrementally, we use this final array for the History to ensure consistency.

        // Add batch to history
        if (generatedImages.length > 0) {
          const newItem: HistoryItem = {
            id: Date.now().toString(),
            thumbnail: generatedImages[0], // Use first image as thumbnail
            images: generatedImages,       // Store entire batch
            prompt: prompt || "Generated Image",
            timestamp: Date.now(),
            mode,
            modelName: selectedModel // Save the model used
          };
          setHistory(prev => [newItem, ...prev]);
        }
        success = true;

      } catch (err: any) {
        console.error(`Attempt ${attempt + 1} failed:`, err);

        // If it's the last attempt, throw the error to exit
        if (attempt === maxRetries) {
          setError(err.message || "Something went wrong during generation.");
          break;
        }

        attempt++;

        // RETRY LOGIC
        // Attempt 1 (First Retry): Count down 2, 1
        if (attempt === 1) {
          // Clear results if we are retrying the whole batch from scratch (due to empty result)
          setResults([]);
          setLoadingState({ title: "Connection Instability", subtitle: "Retrying in 2..." });
          await wait(1000);
          setLoadingState({ title: "Connection Instability", subtitle: "Retrying in 1..." });
          await wait(1000);
          setLoadingState({ title: "Retrying...", subtitle: "Re-establishing connection..." });
        }
        // Attempt 2 (Second Retry): Immediate retry, no countdown
        else if (attempt === 2) {
          setResults([]);
          setLoadingState({ title: "Retrying...", subtitle: "Final attempt..." });
          // No wait
        }
      }
    }

    setIsGenerating(false);
  };

  const handleNewPose = () => {
    if (results.length > 0) {
      const currentImage = results[selectedResultIndex];
      setMode(AppMode.CREATIVE_POSE);
      setPrimaryImage(currentImage);
      setSecondaryImage(null);
      setNumberOfImages(1);
      setPrompt("");
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    if (window.confirm("Are you sure you want to delete all history?")) {
      setHistory([]);
      setResults([]);
    }
  };

  const downloadImage = (imageUrl: string, index = 0, promptText = "", modelNameStr = "") => {
    if (imageUrl) {
      const mimeMatch = imageUrl.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const extension = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : 'png';

      // Sanitize prompt for filename: alphanumeric, underscores, max 40 chars
      const sanitizedPrompt = promptText
        ? promptText.trim().replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').substring(0, 40)
        : "";

      // Determine model tag (flash or pro)
      const modelToUse = modelNameStr || selectedModel;
      const modelTag = modelToUse.includes('flash') ? 'flash' : 'pro';

      const fileName = sanitizedPrompt
        ? `windistudio_${modelTag}_${sanitizedPrompt}_${Date.now()}_${index}.${extension}`
        : `windistudio_${modelTag}_${Date.now()}_${index}.${extension}`;

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadAllHistory = async () => {
    if (history.length === 0) {
      alert("No history to download.");
      return;
    }

    const totalImages = history.reduce((acc, item) => acc + item.images.length, 0);
    if (!window.confirm(`Create a ZIP file of all ${totalImages} images in history?`)) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("windistudio_collection");

      history.forEach((item, itemIndex) => {
        // Determine model tag for history item
        const modelTag = (item.modelName || 'genai').includes('flash') ? 'flash' : 'pro';

        item.images.forEach((imgData, imgIndex) => {
          let base64Data = imgData;
          if (imgData.includes(',')) {
            base64Data = imgData.split(',')[1];
          }

          const mimeMatch = imgData.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : 'png';

          if (folder) {
            folder.file(`batch${itemIndex + 1}_${modelTag}_img${imgIndex + 1}_${item.mode}.${ext}`, base64Data, { base64: true });
          }
        });
      });

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `windistudio_history_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Zip failed", err);
      alert("Failed to generate ZIP file. Please try again.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleTopUp = () => {
    // Simulate top up
    if (calculatedCoins > 0) {
      setUserBalance(prev => prev + calculatedCoins);
      setTopUpAmount('');
      setShowTopUpModal(false);
    }
  };

  // Dynamic Label logic
  let primaryLabel = "1. Source Image";
  let primarySubLabel = "Image to Re-Pose";
  let showSecondary = false;
  let secondaryLabel = "2. Secondary Image";
  let secondarySubLabel = "Reference";

  if (mode === AppMode.VIRTUAL_TRY_ON) {
    primaryLabel = "1. Target Person";
    primarySubLabel = "Person to dress";
    showSecondary = true;
    secondaryLabel = "2. Outfit (Required)";
    secondarySubLabel = "Clothing Reference";
  } else if (mode === AppMode.CREATE_MODEL) {
    primaryLabel = "1. Outfit Reference";
    primarySubLabel = "Clothing to model";
    showSecondary = false;
  } else if (mode === AppMode.COPY_CONCEPT) {
    primaryLabel = "1. Your Face";
    primarySubLabel = "Face Identity";
    showSecondary = true;
    secondaryLabel = "2. Concept / Outfit";
    secondarySubLabel = "Scene & Clothes to Copy";
  }

  const isGenerateDisabled = isGenerating ||
    (mode === AppMode.CREATIVE_POSE && !primaryImage) ||
    (mode === AppMode.CREATE_MODEL && !primaryImage) ||
    (mode === AppMode.VIRTUAL_TRY_ON && (!primaryImage || !secondaryImage)) ||
    (mode === AppMode.COPY_CONCEPT && (!primaryImage || !secondaryImage));

  // --- REUSABLE GLASS COMPONENTS ---

  const ModeButton = ({ active, icon: Icon, label, onClick }: any) => (
    <button
      onClick={onClick}
      className={`
        relative group p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300
        glass-button
        ${active ? 'glass-button-active' : 'text-gray-400 hover:text-white'}
      `}
    >
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-glass-inset
        ${active ? 'bg-mystic-accent text-white shadow-glow' : 'bg-black/20 text-gray-500 group-hover:text-white'}
      `}>
        <Icon size={18} />
      </div>
      <span className={`text-xs font-semibold tracking-wide ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
      {active && <div className="absolute inset-x-4 bottom-0 h-0.5 bg-mystic-accent shadow-[0_0_10px_#8b5cf6]" />}
    </button>
  );

  const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`glass-panel ${className || ''}`}>
      {children}
    </div>
  );

  return (
    // Outer container: Flexible full screen on Desktop, Scrollable on Mobile
    <div className="w-full min-h-screen bg-black flex flex-col font-sans selection:bg-mystic-accent selection:text-white overflow-y-auto lg:overflow-hidden">

      {/* Decorative Background Elements */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-900/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <nav className="w-full h-16 lg:h-20 px-6 lg:px-8 flex justify-between items-center shrink-0 bg-black/20 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0 lg:static">
        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-mystic-accent to-fuchsia-600 flex items-center justify-center shadow-glow animate-float">
            <Wand2 className="text-white w-4 h-4 lg:w-5 lg:h-5" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-gray-400 drop-shadow-sm">
              WindiStudio
            </h1>
            <p className="text-[8px] lg:text-[9px] text-indigo-300 uppercase tracking-widest font-semibold">Liquid Design v2</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Header Info Cluster - Visible if Logged In */}
          {isLoggedIn ? (
            <div className="hidden lg:flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">

              {/* Balance Display */}
              <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2.5 border-white/10 hover:bg-white/5 transition-colors cursor-default shadow-glass-sm">
                <div className="p-1 rounded-full bg-yellow-500/20">
                  <Wallet size={14} className="text-yellow-400" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Balance</span>
                  <span className="text-sm font-bold text-white">{userBalance} xu</span>
                </div>
              </div>

              {/* Top Up Button */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="group flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold shadow-[0_0_20px_rgba(234,179,8,0.4)] hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] hover:scale-105 active:scale-95 transition-all duration-300"
              >
                <Coins size={16} className="fill-black/20 group-hover:rotate-12 transition-transform" />
                <span className="text-xs uppercase tracking-wide">Nạp Tiền</span>
              </button>

              {/* User Profile Pill */}
              <div className="ml-3 pl-4 border-l border-white/10 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Welcome</p>
                  <p className="text-sm font-bold text-white leading-none">User1</p>
                </div>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-mystic-accent to-indigo-600 p-0.5 shadow-glow hover:scale-110 transition-transform cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <User size={18} className="text-white" />
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Login Button (If not logged in) */
            <button
              onClick={() => setShowLoginModal(true)}
              className="hidden lg:flex glass-button px-5 py-2.5 rounded-full items-center gap-2 text-white text-xs font-bold uppercase tracking-wider hover:text-mystic-accent transition-all hover:shadow-glow"
            >
              <LogIn size={16} />
              Đăng Nhập
            </button>
          )}

          {/* Mobile History Toggle */}
          <button
            onClick={() => setShowMobileHistory(!showMobileHistory)}
            className={`
              lg:hidden p-2.5 rounded-full glass-button text-gray-300 hover:text-white
              ${showMobileHistory ? 'glass-button-active' : ''}
            `}
            title="History"
          >
            <History size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content Flex Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative">

        {/* LEFT PANEL: Inputs (Scrollable on Desktop, Auto on Mobile) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 bg-black/10 backdrop-blur-sm z-10 h-auto lg:h-full shrink-0">
          <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar p-6 space-y-6">

            {/* Mode Selector */}
            <div className="glass-panel p-2 rounded-[24px] grid grid-cols-4 gap-1.5 shrink-0">
              <ModeButton
                active={mode === AppMode.CREATIVE_POSE}
                icon={Camera}
                label="Pose"
                onClick={() => setMode(AppMode.CREATIVE_POSE)}
              />
              <ModeButton
                active={mode === AppMode.VIRTUAL_TRY_ON}
                icon={Shirt}
                label="Try-On"
                onClick={() => setMode(AppMode.VIRTUAL_TRY_ON)}
              />
              <ModeButton
                active={mode === AppMode.CREATE_MODEL}
                icon={User}
                label="Model"
                onClick={() => setMode(AppMode.CREATE_MODEL)}
              />
              <ModeButton
                active={mode === AppMode.COPY_CONCEPT}
                icon={Copy}
                label="Concept"
                onClick={() => setMode(AppMode.COPY_CONCEPT)}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerateDisabled}
              className={`
                  w-full py-4 rounded-[20px] font-bold text-base tracking-wide text-white shadow-liquid shrink-0
                  liquid-btn-style transition-all duration-500 transform
                  ${isGenerateDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}
                `}
            >
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
                {isGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} />
                    {loadingState.title === "Dreaming..." ? "Synthesizing..." : "Retrying..."}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="fill-white" />
                    GENERATE
                  </>
                )}
              </span>
            </button>

            {/* PRIMARY CONTROLS: Model & Batch (Moved from Advanced) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Model Selector */}
              <div className="glass-panel p-2.5 rounded-[20px] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase ml-1">
                  <Zap size={10} className="text-yellow-400" />
                  Processing Model
                </div>
                <div className="flex bg-black/20 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    1.5 Flash
                  </button>
                  <button
                    onClick={() => setSelectedModel('gemini-3-pro-image-preview')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-indigo-600 text-white shadow-glow' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    2 Pro
                  </button>
                </div>
              </div>

              {/* Batch Size Selector (4 Buttons) */}
              <div className="glass-panel p-2.5 rounded-[20px] flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 uppercase ml-1">
                  <Layers size={10} className="text-mystic-accent" />
                  Batch Size
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumberOfImages(num)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${numberOfImages === num
                          ? 'bg-mystic-accent border-mystic-accent text-white shadow-glow'
                          : 'bg-black/20 border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-2 gap-4">
              <div className={!showSecondary ? "col-span-2 w-1/2 mx-auto" : "col-span-1"}>
                <ImageUploader
                  label={primaryLabel}
                  subLabel={primarySubLabel}
                  image={primaryImage}
                  onImageChange={setPrimaryImage}
                />
              </div>

              {showSecondary && (
                <div className="col-span-1">
                  <ImageUploader
                    label={secondaryLabel}
                    subLabel={secondarySubLabel}
                    image={secondaryImage}
                    onImageChange={setSecondaryImage}
                  />
                </div>
              )}
            </div>

            {/* Advanced Controls */}
            <div className="glass-panel p-5 rounded-[24px] space-y-5">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers size={14} className="text-mystic-accent" /> Configuration
                </span>
                <button className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
                  {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {showAdvanced && (
                <div className="space-y-5 pt-2 animate-in slide-in-from-top-2">

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1">AI Guidance</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., Cyberpunk background, cinematic lighting..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-mystic-accent focus:bg-black/40 transition-all resize-none shadow-inner h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1.5 block">Aspect Ratio</label>
                      <div className="relative">
                        <select
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:border-mystic-accent outline-none"
                        >
                          {Object.values(AspectRatio).map(ratio => (
                            <option key={ratio} value={ratio} className="bg-mystic-900 text-white">{ratio}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase ml-1 mb-1.5 block">Resolution</label>
                      <div className="relative">
                        <select
                          value={size}
                          onChange={(e) => setSize(e.target.value as ImageSize)}
                          disabled={selectedModel === 'gemini-2.5-flash-image'}
                          className={`w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white appearance-none focus:border-mystic-accent outline-none ${selectedModel === 'gemini-2.5-flash-image' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value={ImageSize.SIZE_1K} className="bg-mystic-900">1K Standard</option>
                          <option value={ImageSize.SIZE_2K} className="bg-mystic-900">2K High</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Hide Creative Freedom in Pose and Model modes */}
                    {(mode !== AppMode.CREATIVE_POSE && mode !== AppMode.CREATE_MODEL) && (
                      <button
                        onClick={() => setFlexibleMode(!flexibleMode)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${flexibleMode ? 'bg-mystic-accent/10 border-mystic-accent text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Shuffle size={14} />
                          <span className="text-xs font-medium">Creative Freedom</span>
                        </div>
                        {flexibleMode ? <ToggleRight className="text-mystic-accent" size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    )}

                    {mode === AppMode.CREATE_MODEL && (
                      <button
                        onClick={() => setRandomFace(!randomFace)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${randomFace ? 'bg-pink-500/10 border-pink-500 text-white' : 'bg-transparent border-white/5 text-gray-400 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2">
                          <ScanFace size={14} />
                          <span className="text-xs font-medium">Randomize Model</span>
                        </div>
                        {randomFace ? <ToggleRight className="text-pink-500" size={20} /> : <ToggleLeft size={20} />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-2xl flex items-start gap-3 text-red-200 animate-in fade-in slide-in-from-top-2 shrink-0">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p className="text-sm leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Output (Flex-Grow on Desktop, Explicit Height on Mobile) */}
        <div ref={outputRef} className="w-full lg:flex-1 h-[70vh] lg:h-auto bg-black/50 relative flex flex-col p-4 lg:p-6 lg:overflow-hidden shrink-0 transition-all">
          <GlassCard className="flex-1 w-full h-full relative group overflow-hidden flex flex-col rounded-[24px] lg:rounded-[32px] border-white/10 shadow-2xl">
            {isGenerating && results.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 bg-black/40 backdrop-blur-sm">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-mystic-accent/30 rounded-full animate-ping" />
                  <div className="absolute inset-2 border-4 border-t-mystic-accent border-r-transparent border-b-pink-500 border-l-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-white animate-pulse" size={24} />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-mystic-accent to-pink-500 animate-pulse">
                    {loadingState.title}
                  </p>
                  <p className="text-gray-400 text-xs tracking-wide">{loadingState.subtitle}</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                {/* Image Viewer */}
                <div className="flex-1 w-full h-full relative">
                  <ImageViewer
                    originalImage={primaryImage}
                    resultImage={results[selectedResultIndex] || results[0]}
                  />

                  {/* Top Right Action Buttons */}
                  <div className="absolute top-4 right-4 flex flex-col gap-3 z-30">
                    <button
                      onClick={() => downloadImage(results[selectedResultIndex], selectedResultIndex, prompt, selectedModel)}
                      className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-mystic-accent transition-all group shadow-glass"
                      title="Save Image"
                    >
                      <Download size={22} className="group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    {mode === AppMode.CREATIVE_POSE && (
                      <button
                        onClick={handleNewPose}
                        className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-pink-400 transition-all shadow-glass"
                        title="Use as Pose"
                      >
                        <Bone size={22} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Batch Thumbnails - Right Aligned */}
                {results.length > 1 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col gap-3 shadow-2xl">
                    {results.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedResultIndex(idx)}
                        className={`
                                relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300
                                ${selectedResultIndex === idx ? 'border-mystic-accent scale-110 shadow-glow' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}
                            `}
                      >
                        <img src={img} alt="" className="w-full h-full object-contain bg-black/80" />
                      </button>
                    ))}
                    {/* Show loading indicator for pending images in batch */}
                    {isGenerating && results.length < numberOfImages && (
                      <div className="w-16 h-16 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center animate-pulse">
                        <RefreshCw className="animate-spin text-gray-500" size={20} />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto opacity-50 p-6">
                <div className="w-20 h-20 rounded-full bg-white/5 mx-auto flex items-center justify-center border border-white/10 shadow-glass-inset">
                  <ImageIcon className="text-gray-500" size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-white">Your Canvas is Empty</h3>
                  <p className="text-xs text-gray-400">
                    Upload references and ignite the engine.
                  </p>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* RIGHT PANEL: History (Fixed Column Desktop, Overlay Mobile) */}
        <div className={`
             fixed inset-0 lg:static lg:inset-auto z-40 bg-black/95 lg:bg-black/10 lg:backdrop-blur-sm lg:border-l border-white/10
             flex flex-col w-full lg:w-[280px] xl:w-[320px] transition-transform duration-300 shrink-0 lg:h-[calc(100vh-80px)] lg:overflow-hidden
             ${showMobileHistory ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4 lg:p-5 border-b border-white/5 flex justify-between items-center bg-black/20 lg:bg-transparent shrink-0">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white uppercase tracking-widest">
              <History size={14} className="text-mystic-accent" />
              History
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={downloadAllHistory} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors" title="Download All">
                <Archive size={16} />
              </button>
              <button onClick={clearHistory} className="p-1.5 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400 transition-colors" title="Clear History">
                <Trash2 size={16} />
              </button>
              {/* Mobile Close Button */}
              <button onClick={() => setShowMobileHistory(false)} className="lg:hidden p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                <XCircle size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
            <div className="grid grid-cols-2 gap-3">
              {history.length === 0 ? (
                <div className="col-span-2 h-40 flex flex-col items-center justify-center text-gray-600 gap-2">
                  <History size={24} className="opacity-20" />
                  <p className="text-xs">No artifacts yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="group relative flex flex-col bg-[#0f0c1d] border border-white/10 rounded-xl overflow-hidden hover:border-mystic-accent/50 transition-all cursor-pointer shadow-lg shrink-0"
                    onClick={() => {
                      setResults(item.images);
                      setSelectedResultIndex(0);
                      setMode(item.mode);
                      setShowMobileHistory(false);
                      // Scroll to output on mobile when history item clicked
                      if (window.innerWidth < 1024) {
                        setTimeout(() => {
                          outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }
                    }}
                  >
                    {/* Card Image */}
                    <div className="w-full aspect-[3/4] bg-black relative">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                      />

                      {/* Actions - Separated & Larger */}

                      {/* Delete: Top Left */}
                      <button
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="absolute top-2 left-2 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white/70 hover:text-red-400 hover:bg-black/80 transition-all border border-white/5 opacity-100 lg:opacity-0 group-hover:opacity-100 z-10"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Download: Top Right */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(item.thumbnail, 0, item.prompt, item.modelName);
                        }}
                        className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full text-white hover:text-mystic-accent hover:bg-black/80 transition-all border border-white/5 opacity-100 lg:opacity-0 group-hover:opacity-100 z-10"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    {/* Card Footer (Time & Mode) */}
                    <div className="p-2 flex flex-col items-center justify-center bg-[#13111c]">
                      <span className="text-[9px] font-medium text-gray-400 tracking-wide">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-full group-hover:text-mystic-accent transition-colors">
                        {item.mode === AppMode.CREATIVE_POSE ? 'Pose' : item.mode === AppMode.VIRTUAL_TRY_ON ? 'Try-On' : item.mode === AppMode.CREATE_MODEL ? 'Model' : 'Concept'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* LOGIN MODAL - Refined to just Login/Logout/Info view since TopUp is separate now */}
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
              </button>

              <div className="p-8 flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-mystic-accent to-indigo-500 p-1 shadow-glow">
                  <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center overflow-hidden">
                    <User size={32} className="text-white" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-white">Account</h2>
                  <p className="text-gray-400 text-xs">Manage your studio identity</p>
                </div>

                {!isLoggedIn ? (
                  <button
                    onClick={() => { setIsLoggedIn(true); setShowLoginModal(false); }}
                    className="w-full py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                    Login with Google
                  </button>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-indigo-500/20 text-indigo-300"><User size={16} /></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Username</span>
                          <span className="text-sm font-medium text-white">User1</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setIsLoggedIn(false); setShowLoginModal(false); }}
                      className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TOP UP MODAL */}
        {showTopUpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
              <button onClick={() => setShowTopUpModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <X size={20} />
              </button>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Coins size={20} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Top Up Credits</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">1 XU = 5000 VND</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 ml-1">Amount (VND)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input
                        type="number"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="Enter amount..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 flex justify-between items-center">
                    <span className="text-xs text-yellow-200/70 font-medium">You will receive:</span>
                    <span className="text-xl font-bold text-yellow-400 drop-shadow-sm">{calculatedCoins} xu</span>
                  </div>

                  <button
                    onClick={handleTopUp}
                    disabled={calculatedCoins <= 0}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-black font-bold shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Purchase Credits
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;