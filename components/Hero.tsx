
import React, { useState, useEffect } from 'react';
import { Play, Star, Zap, Shirt, Camera, Command, Sparkles, Layers, X, ZoomIn } from 'lucide-react';
import Button from './ui/Button';

// Data for the 5 distinct cases
// 2 cases have 2 inputs, 3 cases have 1 input
const showcases = [
  {
    id: 1,
    name: "Mix&Match",
    inputs: ["https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-03%20at%209.35.17%20PM.png",
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.37.35%20PM.png"], // Tee
    output: "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-07%20at%201.08.18%20AM.png", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Tự Do Sáng Tạo"
  },
  {
    id: 2,
    name: "Slay Girl",
    // Dual Input: Blazer + Trousers
    inputs: [
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/windistudio_Generated_Image_1764008168784_0.jpg", // Blazer
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%208.50.22%20PM.png"  // Beige Pants
    ],
    output: "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/windistudio_flash_art_1765028735174_0.jpg", // Model Blazer
    color: "from-blue-500 to-indigo-500",
    prompt: "Life Style Chân Thực"
  },
  {
    id: 3,
    name: "Trang Sức",
    inputs: ["https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-11-23%20at%2010.22.18%20PM.png",
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/gvdrw89488.5a0-gcdrwa89489.5a0-gbdrwa89490.5a0-gndrwa89491.5a0-bo-trang-suc-kim-cuong-pnj-vang-trang-14k.png"], // Dress
    output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765069324255_0.png", // Model Dress
    color: "from-purple-500 to-pink-500",
    prompt: "ảnh cận mặt một cô gái trẻ trang điểm sắt nét, với phong cách như một quý cô sang trọng kiêu kỳ"
  },
  {
    id: 4,
    name: "High Fashion",
    // Dual Input: Jeans + Top
    inputs: [
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.29.27%20PM.png", // Denim Jeans
      "https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.37.35%20PM.png" // White Tee
    ],
    output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765035671361_0.png", // Model Denim
    color: "from-blue-800 to-cyan-700",
    prompt: "Đửng trong một sảnh nhà hàng sang trọng, tay cầm một ly rượu vang trắng"
  },
  {
    id: 5,
    name: "Đa dạng Style",
    inputs: ["https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-07%20at%207.47.40%20AM.png"], // Tee
    output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765045779786_0.png", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Mẫu nam mặc áo khoác đội mũ lên đầu, mặc áo len ở trong, đeo vòng cổ gai bằng bạc, background trong xưởng bỏ hoang,..."
  }
  , {
    id: 6,
    name: "Váy Ngắn Dạ Hội",
    inputs: ["https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%208.07.55%20PM.png"], // Hoodie
    output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765036237940_0.png", // Model Hoodie
    color: "from-orange-500 to-red-500",
    prompt: "Background là hoàng hôn ở paris, phía xa thấy toàn bộ tháp eifel, biểu cảm vui vẻ dễ thương"
  },

  {
    id: 7,
    name: "Áo Dài",
    inputs: ["https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/Screenshot%202025-12-06%20at%2010.15.52%20PM.png"], // Tee
    output: "https://img.windistudio.app/4f018bf9-b2c6-4075-8a21-9018efcb003f/1765033902074_0.png", // Model Tee
    color: "from-gray-500 to-slate-500",
    prompt: "Đang đứng tạo dáng ở chùa cầu Hà Nội"
  }
];

interface HeroProps {
  onEnterStudio: () => void;
}

const Hero: React.FC<HeroProps> = ({ onEnterStudio }) => {
  const [activeCase, setActiveCase] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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
          <div className="space-y-8 z-10 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium text-gray-300 tracking-wide uppercase">Phiên bản 2.5 Pro đã ra mắt</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-semibold leading-[1.1] tracking-tight">
              Tạo ảnh Lookbook <br />
              <span className="text-gradient-gold italic">chuẩn Studio</span> <br />
              bằng AI.
            </h1>

            <p className="text-lg text-gray-400 font-light max-w-xl leading-relaxed">
              Tiết kiệm <span className="text-white font-medium">90% chi phí</span> thuê mẫu và nhiếp ảnh gia.
              Chỉ cần ảnh quần áo (flat-lay hoặc manequin), có ngay ảnh mẫu mặc cực thật trong 30 giây.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">

              <Button
                variant="liquid"
                className="h-14 px-8 mt-auto font-bold text-white border-purple-500/50 bg-purple-900/40 hover:bg-purple-600/80 hover:border-purple-400 hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.4),0_10px_20px_-10px_rgba(168,85,247,0.2)]"
                onClick={onEnterStudio}
              >
                Dùng Thử Miễn Phí
              </Button>
              <Button variant="glass" className="h-14 px-8 text-base group" onClick={onEnterStudio}>
                <Play className="w-4 h-4 mr-2 fill-white group-hover:scale-110 transition-transform" /> Xem Demo
              </Button>
            </div>

            <div className="pt-8 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Xử lý trong 30s</span>
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
                      {item.inputs.length > 1 && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                          <Layers className="w-3 h-3 text-gray-400" />
                          <span className="text-[10px] text-gray-400">Multi-Input</span>
                        </div>
                      )}
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
    </>
  );
};

export default Hero;
