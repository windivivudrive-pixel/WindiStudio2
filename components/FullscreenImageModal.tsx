import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, X, Info, Copy, User } from 'lucide-react';

export interface ModalImage {
    id: string;
    thumbnail: string;
    prompt: string;
    mode?: string;
    imageType?: string;
    userEmail?: string;
}

interface FullscreenImageModalProps {
    images: ModalImage[];
    selectedImage: ModalImage;
    onClose: () => void;
    onNavigate: (image: ModalImage) => void;
    onUseImage?: (url: string, options: any) => void;
    showCreatorInfo?: boolean;
}

export const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
    images,
    selectedImage,
    onClose,
    onNavigate,
    onUseImage,
    showCreatorInfo = false
}) => {
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const zoomLevelRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    const isPinchingRef = useRef(false);
    const initialPinchDistanceRef = useRef(0);
    const initialZoomLevelRef = useRef(1);

    const touchStartRef = useRef<number | null>(null);
    const touchEndRef = useRef<number | null>(null);
    const lastTouchTimeRef = useRef(0);

    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
        if (zoomLevel === 1) {
            panRef.current = { x: 0, y: 0 };
            if (imgRef.current) {
                imgRef.current.style.transform = `scale(1)`;
                imgRef.current.style.cursor = 'zoom-in';
                imgRef.current.style.touchAction = 'auto';
            }
        } else {
            if (imgRef.current) {
                imgRef.current.style.cursor = 'grab';
                imgRef.current.style.touchAction = 'none';
                updateTransform();
            }
        }
    }, [zoomLevel]);

    useEffect(() => {
        setZoomLevel(1);
        panRef.current = { x: 0, y: 0 };
    }, [selectedImage]);

    const updateTransform = () => {
        if (imgRef.current) {
            imgRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomLevelRef.current})`;
        }
    };

    const handleNextImage = (e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (!images || images.length === 0) return;
        const currentIndex = images.findIndex(img => img.id === selectedImage.id);
        if (currentIndex !== -1 && currentIndex < images.length - 1) {
            onNavigate(images[currentIndex + 1]);
        }
    };

    const handlePrevImage = (e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (!images || images.length === 0) return;
        const currentIndex = images.findIndex(img => img.id === selectedImage.id);
        if (currentIndex > 0) {
            onNavigate(images[currentIndex - 1]);
        }
    };

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.min(prev + 1, 4));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.max(prev - 1, 1));
    };

    const handleDoubleTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (zoomLevelRef.current > 1) {
            setZoomLevel(1);
            panRef.current = { x: 0, y: 0 };
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            panRef.current = { x: -x, y: -y };
            setZoomLevel(2);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevelRef.current > 1) {
            e.preventDefault();
            isDraggingRef.current = true;
            dragStartRef.current = {
                x: e.clientX - panRef.current.x,
                y: e.clientY - panRef.current.y
            };
            if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current && zoomLevelRef.current > 1) {
            e.preventDefault();
            panRef.current = {
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            };
            updateTransform();
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        if (imgRef.current && zoomLevelRef.current > 1) imgRef.current.style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
        isDraggingRef.current = false;
        if (imgRef.current && zoomLevelRef.current > 1) imgRef.current.style.cursor = 'grab';
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (zoomLevel === 1) {
                if (e.key === 'ArrowRight') handleNextImage(e);
                if (e.key === 'ArrowLeft') handlePrevImage(e);
                if (e.key === 'Escape') onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImage, images, zoomLevel]);

    useEffect(() => {
        const imgEl = imgRef.current;
        if (!imgEl) return;

        const getDistance = (touches: TouchList) => {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
        };

        const onTouchStart = (e: TouchEvent) => {
            e.stopPropagation();

            if (imgRef.current) {
                imgRef.current.style.transition = 'none';
            }

            if (e.touches.length === 2) {
                isPinchingRef.current = true;
                initialPinchDistanceRef.current = getDistance(e.touches);
                initialZoomLevelRef.current = zoomLevelRef.current;
                return;
            }

            if (e.touches.length === 1) {
                lastTouchTimeRef.current = Date.now();
                touchEndRef.current = null;
                touchStartRef.current = e.touches[0].clientX;
                dragStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };

                if (zoomLevelRef.current > 1) {
                    isDraggingRef.current = true;
                    dragStartRef.current = {
                        x: e.touches[0].clientX - panRef.current.x,
                        y: e.touches[0].clientY - panRef.current.y
                    };
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();

            if (isPinchingRef.current && e.touches.length === 2) {
                const currentDistance = getDistance(e.touches);
                const scale = currentDistance / initialPinchDistanceRef.current;
                const newZoom = Math.min(Math.max(initialZoomLevelRef.current * scale, 1), 4);

                zoomLevelRef.current = newZoom;
                updateTransform();
                return;
            }

            if (e.touches.length === 1) {
                if (zoomLevelRef.current === 1) {
                    touchEndRef.current = e.touches[0].clientX;
                } else if (isDraggingRef.current) {
                    panRef.current = {
                        x: e.touches[0].clientX - dragStartRef.current.x,
                        y: e.touches[0].clientY - dragStartRef.current.y
                    };
                    updateTransform();
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            e.stopPropagation();

            if (imgRef.current && e.touches.length === 0) {
                imgRef.current.style.transition = '';
            }

            if (isPinchingRef.current && e.touches.length < 2) {
                isPinchingRef.current = false;
                setZoomLevel(zoomLevelRef.current);
                return;
            }

            isDraggingRef.current = false;

            if (zoomLevelRef.current === 1 && touchStartRef.current && touchEndRef.current) {
                const distanceX = touchStartRef.current - touchEndRef.current;
                const distanceY = dragStartRef.current.y - e.changedTouches[0].clientY;

                if (Math.abs(distanceX) > 50 && Math.abs(distanceY) < 30) {
                    if (distanceX > 0) handleNextImage();
                    else handlePrevImage();
                }

                if (Math.abs(distanceY) > 50 && Math.abs(distanceX) < 30) {
                    if (distanceY > 0) setShowDetails(true);
                    else setShowDetails(false);
                }
            }
        };

        imgEl.addEventListener('touchstart', onTouchStart, { passive: false });
        imgEl.addEventListener('touchmove', onTouchMove, { passive: false });
        imgEl.addEventListener('touchend', onTouchEnd);

        return () => {
            imgEl.removeEventListener('touchstart', onTouchStart);
            imgEl.removeEventListener('touchmove', onTouchMove);
            imgEl.removeEventListener('touchend', onTouchEnd);
        };
    }, [selectedImage]);

    const handleCopyPrompt = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Prompt copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className={`absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-50 ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <X size={24} />
            </button>

            <div
                className={`w-full h-full flex flex-col md:flex-row max-w-7xl mx-auto p-4 md:p-8 gap-6 transition-all duration-300 ${!showControls || zoomLevel > 1 ? 'max-w-full p-0 md:p-0' : ''}`}
                onClick={e => e.stopPropagation()}
                style={{ touchAction: 'none' }}
            >
                <div
                    className={`flex-1 relative flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden border border-white/5 select-none transition-all duration-300 ${!showControls || zoomLevel > 1 ? 'rounded-none border-0 bg-black' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    <img
                        ref={imgRef}
                        src={selectedImage.thumbnail}
                        alt="Fullscreen"
                        className={`max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 ${zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
                        onDoubleClick={handleDoubleTap}
                        draggable={false}
                    />

                    {images && images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevImage}
                                className={`absolute left-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            >
                                <ChevronLeft size={32} />
                            </button>
                            <button
                                onClick={handleNextImage}
                                className={`absolute right-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            >
                                <ChevronRight size={32} />
                            </button>
                        </>
                    )}

                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <button
                            onClick={handleZoomOut}
                            disabled={zoomLevel <= 1}
                            className={`p-2 rounded-full transition-colors ${zoomLevel <= 1 ? 'text-white/20 cursor-not-allowed' : 'text-white hover:bg-white/20'}`}
                        >
                            <Minus size={20} />
                        </button>
                        <span className="text-xs font-bold text-white w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <button
                            onClick={handleZoomIn}
                            disabled={zoomLevel >= 4}
                            className={`p-2 rounded-full transition-colors ${zoomLevel >= 4 ? 'text-white/20 cursor-not-allowed' : 'text-white hover:bg-white/20'}`}
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDetails(prev => !prev);
                        }}
                        className={`md:hidden absolute bottom-6 right-6 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg z-[65] transition-all ${!showControls || showDetails ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
                    >
                        <Info size={24} />
                    </button>

                    {selectedImage.imageType && (
                        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-xs font-medium text-white/90 shadow-lg pointer-events-none">
                            {(() => {
                                const type = selectedImage.imageType?.toLowerCase();
                                if (type === 'standard') return '🍌 Banana';
                                if (type === 'premium') return '🍌 BananaPro';
                                if (type === 's4.0') return '🌱 Seedream 4';
                                if (type === 's4.5') return '🌱 Seedream 4.5';
                                if (type === 'scale2' || type === 'scalex2') return '2K';
                                if (type === 'scale4') return '4K';
                                return selectedImage.imageType || 'AI';
                            })()}
                        </div>
                    )}
                </div>

                <div className={`md:hidden fixed inset-x-0 bottom-0 z-[60] bg-[#1a1a1a] rounded-t-3xl p-6 flex flex-col gap-4 transition-transform duration-300 ease-out shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10 ${showDetails ? 'translate-y-0' : 'translate-y-full'}`}>
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />

                    <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                                Prompt
                                <button
                                    onClick={() => handleCopyPrompt(selectedImage.prompt)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <Copy size={14} />
                                </button>
                            </h3>
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedImage.prompt}
                                </p>
                            </div>
                        </div>

                        {showCreatorInfo && selectedImage.userEmail && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                                <User size={14} className="text-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Creator</span>
                                    <span className="text-xs text-white truncate max-w-[200px]">{selectedImage.userEmail}</span>
                                </div>
                            </div>
                        )}

                        {onUseImage && (
                            <button
                                onClick={() => {
                                    onUseImage(selectedImage.thumbnail, {
                                        mode: selectedImage.mode,
                                        imageType: selectedImage.imageType,
                                        prompt: selectedImage.prompt
                                    });
                                    onClose();
                                }}
                                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-glow flex items-center justify-center gap-2 mt-2"
                            >
                                Use Image
                            </button>
                        )}
                    </div>
                </div>

                {showControls && zoomLevel === 1 && (
                    <div className="hidden md:flex w-full md:w-80 lg:w-96 flex-col gap-4 shrink-0 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/10 bg-[#1a1a1a]">
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                                    Prompt
                                    <button
                                        onClick={() => handleCopyPrompt(selectedImage.prompt)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                        title="Copy Prompt"
                                    >
                                        <Copy size={14} />
                                    </button>
                                </h3>
                                <div className="p-3 rounded-xl bg-black/40 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                    <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                        {selectedImage.prompt}
                                    </p>
                                </div>
                            </div>

                            {showCreatorInfo && selectedImage.userEmail && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                                    <User size={14} className="text-gray-400" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase font-bold">Creator</span>
                                        <span className="text-xs text-white truncate max-w-[200px]">{selectedImage.userEmail}</span>
                                    </div>
                                </div>
                            )}

                            {onUseImage && (
                                <div className="mt-auto pt-2">
                                    <button
                                        onClick={() => {
                                            onUseImage(selectedImage.thumbnail, {
                                                mode: selectedImage.mode,
                                                imageType: selectedImage.imageType,
                                                prompt: selectedImage.prompt
                                            });
                                            onClose();
                                        }}
                                        className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-glow flex items-center justify-center gap-2"
                                    >
                                        Use Image
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
