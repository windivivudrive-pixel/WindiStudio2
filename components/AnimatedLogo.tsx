import React from 'react';

export const AnimatedLogo: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`relative group ${className} flex items-center justify-center`}>
            {/* 1. The "Running Border" / Glow Layer */}
            {/* We use the logo as a mask for a spinning gradient, scaled up to create a border effect */}
            <div
                className="absolute inset-0 z-0 opacity-75 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    maskImage: "url('/logo.png')",
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskImage: "url('/logo.png')",
                    WebkitMaskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                }}
            >
                {/* The spinning gradient that fills the masked area */}
                {/* We scale this container slightly to make it peek out from behind the main logo? 
            Actually, scaling the mask container shifts the mask. 
            Better approach: Use filter drop-shadow on the main logo for the shape, 
            OR use this layer as a "filled" version and scale it. 
            Let's try scaling this layer. */}
                <div className="w-full h-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0deg,#8b5cf6_90deg,#ec4899_180deg,#8b5cf6_270deg,transparent_360deg)] scale-110 blur-[2px]"></div>
            </div>

            {/* Alternative Approach: Colored Drop Shadow Animation (Simpler & cleaner for complex shapes) */}
            {/* If the above masking + scaling is tricky (alignment issues), we fallback to this: */}
            <img
                src="/logo.png"
                alt="WindiStudio Logo"
                className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_2px_rgba(139,92,246,0.5)] group-hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] transition-all duration-300"
            />

            {/* Overlay for "Running" effect on the border specifically? 
          It's hard to mask a gradient *only* to the border of a PNG. 
          The best approximation is the drop-shadow glow + the background spin if aligned well.
          Let's try a mix: A spinning gradient BEHIND the logo, masked by the logo, but scaled up.
      */}
            <div
                className="absolute inset-[-10%] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    maskImage: "url('/logo.png')",
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskImage: "url('/logo.png')",
                    WebkitMaskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                }}
            >
                <div className="w-full h-full bg-gradient-to-r from-mystic-accent via-pink-500 to-mystic-accent animate-liquid"></div>
            </div>
        </div>
    );
};
