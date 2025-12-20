
import React, { useState, useEffect } from 'react';
import { Play, Star, Zap, Shirt, Camera, Command, Sparkles, Layers, X, ZoomIn } from 'lucide-react';
import Button from './ui/Button';

// Data for the 5 distinct cases
// 2 cases have 2 inputs, 3 cases have 1 input
const showcases = [
  {
    id: 1,
    name: "Tạo Poster",
    inputs: ["https://img.windistudio.app/stock1.png",
      "https://img.windistudio.app/poster_mau1.jpg"], // Tee
    output: "https://img.windistudio.app/poster%20linhka.png", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Tạo Poster tương tự với poster mẫu, theo chủ đề lunar new year",
    model: "Seedream 4.5"
  },
  {
    id: 2,
    name: "Slay Girl",
    // Dual Input: Blazer + Trousers
    inputs: [
      "https://img.windistudio.app/inhome31.jpg", // Blazer
      "https://img.windistudio.app/inhome32.jpg"  // Beige Pants
    ],
    output: "https://img.windistudio.app/outhome3.png", // Model Blazer
    color: "from-blue-500 to-indigo-500",
    prompt: "Life Style Chân Thực",
    model: "Nano Banana Pro"
  },
  {
    id: 3,
    name: "Typography",
    // Dual Input: Jeans + Top
    inputs: [
      // Denim Jeans
    ],
    output: "https://img.windistudio.app/outputmain33.jpg", // Model Denim
    color: "from-blue-800 to-cyan-700",
    prompt: "Sáng tạo theo Font chữ của bạn",
    model: "Nano Banana Pro"
  },
  {
    id: 4,
    name: "Poster theo Chủ đề",
    inputs: ["https://img.windistudio.app/Screenshot%202025-12-19%20at%2011.37.22%E2%80%AFPM.png"], // Dress
    output: "https://img.windistudio.app/poster2.jpeg", // Model Dress
    color: "from-purple-500 to-pink-500",
    prompt: "Poster Sản phẩm chủ đề noel",
    model: "Seedream 4.5"
  },

  // {
  //   id: 4,
  //   name: "High Fashion",
  //   // Dual Input: Jeans + Top
  //   inputs: [
  //     "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.29.27%20PM.png", // Denim Jeans
  //     "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.37.35%20PM.png" // White Tee
  //   ],
  //   output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765035671361_0.png", // Model Denim
  //   color: "from-blue-800 to-cyan-700",
  //   prompt: "Đửng trong một sảnh nhà hàng sang trọng, tay cầm một ly rượu vang trắng"
  // },
  {
    id: 5,
    name: "Model 3D",
    inputs: [], // Tee
    output: "https://img.windistudio.app/output_hanoi.jpg", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Thỏa Sức Sáng Tạo",
    model: "Nano Banana Pro"
  }
  ,
  {
    id: 7,
    name: "Áo Dài",
    inputs: ["https://img.windistudio.app/inputaodai.png"], // Tee
    output: "https://img.windistudio.app/aodaido.jpeg", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Đang đứng tạo dáng ở chùa cầu Hà Nội",
    model: "Nano Banana Pro"
  }
];

interface HeroProps {
  onEnterStudio: () => void;
}

const Hero: React.FC<HeroProps> = ({ onEnterStudio }) => {
  const [activeCase, setActiveCase] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // Pause auto-rotation if an image is zoomed
    if (zoomedImage) return;

    const timer = setInterval(() => {
      setActiveCase((prev) => (prev + 1) % showcases.length);
    }, 2500); // 2.5s duration

    return () => clearInterval(timer);
  }, [zoomedImage]);

  // Function to calculate styles for "Card Selection" Effect
  const getSlideStyles = (index: number) => {
    const len = showcases.length;
    let offset = (index - activeCase) % len;
    if (offset < 0) offset += len;
    if (offset > len / 2) offset -= len;

    // Common styles
    let styles: React.CSSProperties = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      // Removed bouncy cubic-bezier, used standard smooth ease
      transition: 'all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      zIndex: 0,
      opacity: 0,
      visibility: 'hidden',
      transform: 'translate(-50%, -50%) scale(0.5)',
    };

    if (offset === 0) {
      // CENTER (Active)
      // Highest, centered, full opacity
      styles = {
        ...styles,
        opacity: 1,
        zIndex: 50,
        visibility: 'visible',
        transform: 'translate(-50%, -50%) scale(1) rotate(0deg)',
        filter: 'brightness(1.1)',
      };
    } else if (offset === -1 || offset === len - 1) { // len-1 handles the wrap around for "previous"
      // LEFT 1 (Previous)
      // Shift left, scale down, drop down slightly (translateY -42% is lower than -50%), tilt left
      styles = {
        ...styles,
        opacity: 0.5,
        zIndex: 40,
        visibility: 'visible',
        transform: 'translate(-105%, -46%) scale(0.85) rotate(-6deg)',
        filter: 'brightness(0.6) blur(2px)',
      };
    } else if (offset === 1) {
      // RIGHT 1 (Next)
      // Shift right, scale down, drop down slightly, tilt right
      styles = {
        ...styles,
        opacity: 0.5,
        zIndex: 40,
        visibility: 'visible',
        transform: 'translate(5%, -46%) scale(0.85) rotate(6deg)',
        filter: 'brightness(0.6) blur(2px)',
      };
    }
    // Hiding other cards to keep layout clean (only 3 visible)

    return styles;
  };

  return (
    <>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text Content */}
          <div className="space-y-4 z-10 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">Early Access</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight">
              <span className="font-miller text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl">Thuần Hóa AI</span> <br />
              <span className="font-motion text-gradient-gold text-4xl sm:text-5xl md:text-6xl lg:text-7xl pr-4 tracking-wide inline-block mb-2.5 pb-2">Kiến tạo Tương Lai</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-400 font-light max-w-xl leading-relaxed">
              Tương lai thuộc về những người biết điều khiển AI. <br />
              <span className="font-semibold text-white">Đừng để AI thay thế bạn!</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">

              <button
                className="inline-flex items-center justify-center h-11 px-6 rounded-full font-bold text-white bg-purple-800/60 border border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] active:scale-95 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.4),0_10px_20px_-10px_rgba(168,85,247,0.3)]"
                onClick={onEnterStudio}
              >
                Bắt Đầu Ngay
              </button>
              {/* <button
                className="inline-flex items-center justify-center h-11 px-6 rounded-full font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all duration-300 group"
                onClick={() => setShowVideo(true)}
              >
                <Play className="w-4 h-4 mr-2 fill-white group-hover:scale-110 transition-transform" /> Xem Demo
              </button> */}
            </div>

            <div className="pt-2 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Mô hình Nano Banana Pro, Seedream 4.5</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                <span>Chất lượng 4K</span>
              </div>
            </div>
          </div>

          {/* Hero Visual - Card Deck Carousel */}
          <div className="relative z-10 h-[600px] w-full flex items-center justify-center [perspective:1000px] pointer-events-none md:pointer-events-auto">

            {/* Ambient Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-tr ${showcases[activeCase].color} opacity-20 rounded-full blur-[100px] transition-colors duration-1000`} />

            {/* Carousel Items */}
            {showcases.map((item, index) => (
              <div
                key={item.id}
                style={getSlideStyles(index)}
                className="w-[300px] md:w-[380px]"
              >
                {/* 
                   GROUP CONTAINER: Output (Model) + Inputs (Cloth) + Prompt Box
                */}
                <div className="relative w-full aspect-[3/4]">

                  {/* 1. Main Output Card (Model) */}
                  <div
                    className={`absolute inset-0 glass-panel rounded-2xl p-2 md:p-3 overflow-hidden shadow-2xl bg-neutral-900/80 ring-1 ring-white/10 z-20 group transition-all duration-300 ${index === activeCase ? 'cursor-zoom-in hover:ring-white/30' : ''}`}
                    onClick={() => {
                      if (index === activeCase) {
                        setZoomedImage(item.output);
                      }
                    }}
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden relative">
                      <img
                        src={item.output}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Overlay: AI Tag */}
                      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <Camera className="w-3 h-3 text-white" />
                        <span className="text-[10px] text-white font-medium tracking-wide">AI GENERATED</span>
                      </div>

                      {/* Zoom Hint Overlay (Only visible on hover of active card) */}
                      {index === activeCase && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/20">
                            <ZoomIn className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Overlay: Concept Name */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
                        <p className="text-[10px] text-gray-300 uppercase tracking-widest mb-1 font-semibold">Style Concept</p>
                        <p className="text-2xl font-display text-white">{item.name}</p>
                      </div>
                    </div>
                  </div>

                  {/* 2. Floating Input Cards (Cloth) */}
                  {/* Iterating through inputs to stack them if there are multiple */}
                  {item.inputs.map((inputUrl, idx) => {

                    let positionClasses = "";

                    if (item.inputs.length === 1) {
                      // Single Input Case: Original Position
                      positionClasses = "-bottom-6 -right-4 md:-right-10 rotate-[6deg] z-40";
                    } else {
                      // Multi-Input Case: Fan Layout (Side-by-side)
                      if (idx === 0) {
                        // Left Card (Input 1)
                        positionClasses = "-bottom-8 right-20 md:right-28 rotate-[-8deg] z-30 scale-95 hover:scale-100 hover:z-50";
                      } else {
                        // Right Card (Input 2)
                        positionClasses = "-bottom-8 -right-4 md:-right-6 rotate-[8deg] z-40 hover:scale-105";
                      }
                    }

                    return (
                      <div
                        key={`${item.id}-input-${idx}`}
                        className={`absolute w-28 md:w-36 aspect-[3/4] glass-panel rounded-xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 bg-neutral-800 ${positionClasses} ${index === activeCase ? 'opacity-100' : 'opacity-0 scale-75'}`}
                      >
                        <div className="w-full h-full rounded-lg bg-neutral-900 overflow-hidden relative group">
                          <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1 flex items-center gap-1 z-10">
                            <div className={`w-1.5 h-1.5 rounded-full ${idx > 0 ? 'bg-blue-400' : 'bg-green-500'}`}></div>
                            <span className="text-[9px] text-gray-200 uppercase font-bold tracking-wider">
                              {item.inputs.length > 1 ? `Input ${idx + 1}` : 'Input'}
                            </span>
                          </div>
                          <img
                            src={inputUrl}
                            alt={`Input ${idx + 1}`}
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* 3. Prompt Box - Attached to bottom left */}
                  {/* Only show prompt box for the active card */}
                  <div
                    className={`absolute -bottom-24 left-0 md:-left-8 right-0 md:right-auto md:w-[420px] glass-panel bg-black/80 rounded-xl p-4 border border-white/10 shadow-xl backdrop-blur-xl z-50 transition-all duration-500 ${index === activeCase ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Command className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prompt Used</span>
                      </div>
                      {/* Show model name that created this image */}
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-400/20">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] text-purple-300 font-medium">{item.model}</span>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-200 font-mono leading-relaxed opacity-90">
                      <span className="text-purple-400">$</span> {item.prompt} <span className="animate-pulse inline-block w-1.5 h-3 bg-purple-400 ml-1 align-middle"></span>
                    </p>
                  </div>

                </div>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            onClick={() => setZoomedImage(null)}
          >
            <X size={24} />
          </button>
          <div
            className="relative max-w-7xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImage}
              alt="Zoomed view"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl scale-95 animate-in zoom-in-95 duration-300 select-none"
            />
          </div>
        </div>
      )}

      {/* Video Demo Modal */}
      {showVideo && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setShowVideo(false)}
        >
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            onClick={() => setShowVideo(false)}
          >
            <X size={24} />
          </button>
          <div
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src="https://drive.google.com/file/d/1_iLL0opAEKCBXfhDnzh0e71l9RAci997/preview"
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Hero;
