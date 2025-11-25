import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, Columns, Maximize, MousePointer2 } from 'lucide-react';

interface ImageViewerProps {
  originalImage: string | null;
  resultImage: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ originalImage, resultImage }) => {
  // Default to Full Output (False) instead of Split
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50); // Percentage
  
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [transformOrigin, setTransformOrigin] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const lastClientRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Reset view when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    // Always default to full view when result changes
    setIsSplitMode(false);
    setSplitPosition(50);
  }, [resultImage]);

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Split View Logic (Only if active and not zoomed)
    if (isSplitMode && scale === 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSplitPosition((x / rect.width) * 100);
    }

    // 2. Panning Logic (Only if zoomed)
    if (panning && scale > 1) {
      e.preventDefault();
      const deltaX = e.clientX - lastClientRef.current.x;
      const deltaY = e.clientY - lastClientRef.current.y;
      
      if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
         hasMovedRef.current = true;
      }

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      lastClientRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  // Handle Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault(); 

    // DISABLE ZOOM IN SPLIT MODE
    if (isSplitMode) return;

    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const zoomIntensity = 0.1;
    const newScale = Math.min(Math.max(1, scale + (e.deltaY < 0 ? zoomIntensity : -zoomIntensity)), 5);

    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    } else if (scale === 1 && newScale > 1) {
      setTransformOrigin({
        x: offsetX,
        y: offsetY
      });
    }

    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    hasMovedRef.current = false;
    if (scale > 1) {
      setPanning(true);
      lastClientRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
  };

  const handleContainerClick = () => {
    // Only toggle if we have an original image AND we aren't panning/zooming
    if (scale > 1 && hasMovedRef.current) return;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black/40 rounded-[32px] select-none shadow-inner
        ${scale > 1 ? (panning ? 'cursor-grabbing' : 'cursor-grab') : (isSplitMode ? 'cursor-col-resize' : 'cursor-default')}
      `}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      {/* Content Container */}
      <div 
        className="w-full h-full relative pointer-events-none"
        style={{
          transformOrigin: `${transformOrigin.x}px ${transformOrigin.y}px`,
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: panning ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        {/* 
           LAYER 1 (Bottom): Result Image (Default Base) OR Original in Split Mode
           If Split Mode: This is the background layer.
           If Full Mode: This is the ONLY layer we see (Result).
        */}
        <img 
          src={isSplitMode && originalImage ? originalImage : resultImage} 
          alt="Base" 
          className="absolute inset-0 w-full h-full object-contain"
        />

        {/* 
           LAYER 2 (Top): Result Image overlay for Split Mode
           Only active when isSplitMode is true
        */}
        {isSplitMode && originalImage && (
          <div 
            className="absolute inset-0 w-full h-full"
            style={{
              clipPath: `polygon(${splitPosition}% 0, 100% 0, 100% 100%, ${splitPosition}% 100%)`
            }}
          >
            <img 
              src={resultImage} 
              alt="Result" 
              className="w-full h-full object-contain"
            />
            
            {/* Divider Line */}
            <div 
               className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
               style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
             />
             
             <div 
                className="absolute top-1/2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-glow flex items-center justify-center -translate-y-1/2 pointer-events-none"
                style={{ left: `${splitPosition}%`, transform: 'translate(-50%, -50%)' }}
             >
                <Columns size={12} className="text-white" />
             </div>
          </div>
        )}
      </div>

      {/* Internal Controls (Top Left to avoid collision with App buttons) */}
      <div className="absolute top-4 left-4 flex gap-2 z-30">
        
        {/* Toggle Split / Full View */}
        {originalImage && (
            <button 
                onClick={(e) => { e.stopPropagation(); setIsSplitMode(!isSplitMode); }}
                className="glass-button w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-mystic-accent transition-all group shadow-glass"
                title={isSplitMode ? "Switch to Full View" : "Compare with Original"}
            >
                {isSplitMode ? <Maximize size={22} /> : <Columns size={22} />}
            </button>
        )}

        {/* Zoom Indicator */}
        {!isSplitMode && scale > 1 && (
          <div className="glass-panel px-4 py-2 rounded-full text-xs text-white font-bold tracking-wider flex items-center gap-2 animate-in fade-in h-12">
             <ZoomIn size={14} className="text-mystic-accent" />
             {(scale * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Helper Text for Split Mode */}
      {isSplitMode && originalImage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none z-30">
           <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] text-white/80 font-bold uppercase tracking-wider">
              Original
           </div>
           <div className="bg-mystic-accent/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-[10px] text-white font-bold uppercase tracking-wider shadow-glow">
              Result
           </div>
        </div>
      )}
    </div>
  );
};