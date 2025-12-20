
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Stamp, LayoutTemplate, Save, RefreshCw, Grid, Layers, MoveHorizontal, MoveVertical, Eye, EyeOff, Download, Plus, ImagePlus, X } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { BrandingConfig, Category } from '../types';
import { fetchCategories, createReferenceImage } from '../services/supabaseService';

interface BrandingPageProps {
    brandingLogo: string | null;
    setBrandingLogo: (logo: string | null) => void;
    brandingConfig: BrandingConfig;
    setBrandingConfig: (config: BrandingConfig) => void;
    isSavingBranding: boolean;
    handleSaveBranding: () => void;
    onBack: () => void;
    userId?: string;
}

export const BrandingPage: React.FC<BrandingPageProps> = ({
    brandingLogo,
    setBrandingLogo,
    brandingConfig,
    setBrandingConfig,
    isSavingBranding,
    handleSaveBranding,
    onBack,
    userId
}) => {

    // Safe defaults if fields are missing
    const currentX = brandingConfig.x ?? 90;
    const currentY = brandingConfig.y ?? 90;
    const currentGap = brandingConfig.gap ?? 10;
    const isLoop = brandingConfig.layoutMode === 'loop';
    const applyToPreview = brandingConfig.applyToPreview !== false; // Default true

    // Reference Image Form State
    const [showRefForm, setShowRefForm] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [refImageUrl, setRefImageUrl] = useState('');
    const [refPrompt, setRefPrompt] = useState('');
    const [refImageType, setRefImageType] = useState('studio');
    const [refCategoryId, setRefCategoryId] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (showRefForm) {
            fetchCategories().then(setCategories);
        }
    }, [showRefForm]);

    const handleSubmitRefImage = async () => {
        if (!refImageUrl || !userId) {
            alert('Vui lòng nhập URL ảnh');
            return;
        }

        setIsSubmitting(true);
        const success = await createReferenceImage({
            user_id: userId,
            image_url: refImageUrl,
            prompt: refPrompt,
            image_type: refImageType,
            category_id: refCategoryId,
            is_favorite: true
        });

        setIsSubmitting(false);

        if (success) {
            alert('Đã thêm ảnh tham chiếu thành công!');
            setShowRefForm(false);
            setRefImageUrl('');
            setRefPrompt('');
            setRefImageType('studio');
            setRefCategoryId(undefined);
        } else {
            alert('Lỗi khi thêm ảnh tham chiếu');
        }
    };

    const updateConfig = (key: keyof BrandingConfig, value: any) => {
        setBrandingConfig({ ...brandingConfig, [key]: value });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black overflow-y-auto custom-scrollbar">
            {/* HEADER */}
            <div className="shrink-0 p-4 lg:p-10 lg:pb-4 flex items-center gap-4">
                <button onClick={onBack} className="glass-button p-2 rounded-full text-white hover:text-mystic-accent">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl lg:text-3xl font-bold text-white tracking-tight">Branding Kit</h1>
            </div>

            {/* MOBILE: Sticky Preview at top */}
            <div className="shrink-0 sticky top-0 z-30 px-4 pb-2 lg:hidden bg-gradient-to-b from-black via-black/95 to-transparent">
                <div className="glass-panel p-1.5 rounded-[16px] w-full h-[35vh] flex flex-col shadow-2xl bg-black/90 backdrop-blur-xl">
                    <div className="flex-1 bg-black/40 rounded-[12px] relative overflow-hidden flex items-center justify-center border border-white/5">
                        <img
                            src="https://img.windistudio.app/2fcdb6e1-c0ca-4cca-ad8c-92560425dc35/1765193961517_0.png"
                            alt="Preview Base"
                            className="w-full h-full object-contain"
                        />
                        {brandingLogo && (
                            isLoop ? (
                                <div className="absolute w-full flex overflow-hidden whitespace-nowrap" style={{ top: `${currentY}%`, transform: 'translateY(-50%)', opacity: brandingConfig.opacity }}>
                                    <div className="flex" style={{ gap: `${currentGap}px`, transform: `translateX(${currentX}px)` }}>
                                        {[1, 2, 3, 4, 5, 6].map(i => <img key={i} src={brandingLogo} alt="logo" style={{ width: `${brandingConfig.scale * 150}px` }} className="object-contain" />)}
                                    </div>
                                </div>
                            ) : (
                                <img src={brandingLogo} alt="Logo" className="absolute" style={{ width: `${brandingConfig.scale * 100}%`, opacity: brandingConfig.opacity, left: `${currentX}%`, top: `${currentY}%`, transform: 'translate(-50%, -50%)' }} />
                            )
                        )}
                    </div>
                    <div className="px-2 py-1 flex justify-between items-center text-[8px] text-gray-400">
                        <span>Preview</span>
                        <span>{isLoop ? `Y=${currentY}%` : `X=${currentX}%, Y=${currentY}%`}</span>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="p-4 lg:p-10 lg:pt-0 max-w-6xl mx-auto pb-32">
                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8">

                    {/* DESKTOP ONLY: Preview Panel */}
                    <div className="hidden lg:block lg:order-2 lg:col-span-2">
                        <div className="glass-panel p-2 rounded-[32px] w-full min-h-[400px] flex flex-col shadow-2xl">
                            <div className="flex-1 bg-black/40 rounded-[20px] lg:rounded-[24px] relative overflow-hidden flex items-center justify-center border border-white/5">
                                {/* Placeholder Image */}
                                <img
                                    src="https://img.windistudio.app/2fcdb6e1-c0ca-4cca-ad8c-92560425dc35/1765193961517_0.png"
                                    alt="Preview Base"
                                    className="w-full h-full object-cover"
                                />

                                {/* Overlay Grid Guide */}
                                <div className="absolute inset-0 border border-white/5 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-20">
                                    <div className="border-r border-b border-white/10"></div>
                                    <div className="border-r border-b border-white/10"></div>
                                    <div className="border-r border-b border-white/10"></div>
                                    <div className="border-b border-white/10"></div>
                                </div>

                                {/* Branding Logo Overlay Logic */}
                                {brandingLogo && (
                                    isLoop ? (
                                        /* LOOP MODE PREVIEW */
                                        <div
                                            className="absolute w-full flex overflow-hidden whitespace-nowrap"
                                            style={{
                                                top: `${currentY}%`,
                                                transform: 'translateY(-50%)',
                                                opacity: brandingConfig.opacity,
                                            }}
                                        >
                                            <div className="flex" style={{ gap: `${currentGap}px`, transform: `translateX(${currentX}px)` }}>
                                                {[1, 2, 3, 4, 5, 6].map(i => (
                                                    <img
                                                        key={i}
                                                        src={brandingLogo}
                                                        alt="logo"
                                                        style={{ width: `${brandingConfig.scale * 500}px` }}
                                                        className="object-contain"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* SINGLE MODE PREVIEW */
                                        <img
                                            src={brandingLogo}
                                            alt="Logo"
                                            className="absolute transition-all duration-100 ease-linear"
                                            style={{
                                                width: `${brandingConfig.scale * 100}%`,
                                                opacity: brandingConfig.opacity,
                                                left: `${currentX}%`,
                                                top: `${currentY}%`,
                                                transform: 'translate(-50%, -50%)', // Center on the coordinates
                                            }}
                                        />
                                    )
                                )}
                            </div>

                            <div className="p-3 flex justify-between items-center text-[10px] lg:text-xs text-gray-400">
                                <div>Preview Canvas</div>
                                <div>{isLoop ? `Loop: Y=${currentY}%, Gap=${currentGap}` : `X=${currentX}%, Y=${currentY}%`}</div>
                            </div>
                        </div>
                    </div>

                    {/* SETTINGS PANEL */}
                    {/* Mobile: Order 2 (Bottom). Desktop: Order 1 (Left) */}
                    <div className="order-2 lg:order-1 space-y-6 lg:col-span-1 pb-10 lg:pb-0">

                        <div className="glass-panel p-3 lg:p-4 rounded-[24px] space-y-3">
                            <h3 className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Stamp size={16} /> Logo Upload
                            </h3>
                            <ImageUploader label="" subLabel="Upload PNG Logo" image={brandingLogo} onImageChange={setBrandingLogo} />
                        </div>

                        <div className="glass-panel p-5 lg:p-6 rounded-[24px] space-y-6">
                            <h3 className="text-xs lg:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <LayoutTemplate size={16} /> Configuration
                            </h3>

                            {/* Visibility Toggle */}
                            <div className="p-1 bg-black/40 rounded-xl flex">
                                <button
                                    onClick={() => updateConfig('applyToPreview', true)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${applyToPreview ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Eye size={14} /> Always Visible
                                </button>
                                <button
                                    onClick={() => updateConfig('applyToPreview', false)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${!applyToPreview ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Download size={14} /> Download Only
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 text-center -mt-3 italic">
                                {applyToPreview
                                    ? "Watermark is shown on screen. Long-press saving on mobile will include logo."
                                    : "Watermark hidden on screen. Only added when using the 'Download' button."}
                            </p>

                            <hr className="border-white/5" />

                            {/* Layout Mode Toggle */}
                            <div className="p-1 bg-black/40 rounded-xl flex">
                                <button
                                    onClick={() => updateConfig('layoutMode', 'single')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${!isLoop ? 'bg-mystic-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Grid size={14} /> Single
                                </button>
                                <button
                                    onClick={() => updateConfig('layoutMode', 'loop')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${isLoop ? 'bg-mystic-accent text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                >
                                    <Layers size={14} /> Loop
                                </button>
                            </div>

                            {/* Scale */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><RefreshCw size={12} /> Size</span>
                                    <span>{Math.round(brandingConfig.scale * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={brandingConfig.scale * 100}
                                    onChange={(e) => updateConfig('scale', parseInt(e.target.value) / 100)}
                                    className="w-full h-1 bg-black/40 rounded-full appearance-none accent-mystic-accent cursor-pointer"
                                />
                            </div>

                            {/* Opacity */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Layers size={12} /> Opacity</span>
                                    <span>{Math.round(brandingConfig.opacity * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={brandingConfig.opacity * 100}
                                    onChange={(e) => updateConfig('opacity', parseInt(e.target.value) / 100)}
                                    className="w-full h-1 bg-black/40 rounded-full appearance-none accent-mystic-accent cursor-pointer"
                                />
                            </div>

                            <hr className="border-white/5" />

                            {/* X Axis */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><MoveHorizontal size={12} /> {isLoop ? 'Start Offset (X)' : 'Position X'}</span>
                                    <span>{currentX}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentX}
                                    onChange={(e) => updateConfig('x', parseInt(e.target.value))}
                                    className="w-full h-1 bg-black/40 rounded-full appearance-none accent-blue-500 cursor-pointer"
                                />
                            </div>

                            {/* Y Axis */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><MoveVertical size={12} /> Position Y</span>
                                    <span>{currentY}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentY}
                                    onChange={(e) => updateConfig('y', parseInt(e.target.value))}
                                    className="w-full h-1 bg-black/40 rounded-full appearance-none accent-pink-500 cursor-pointer"
                                />
                            </div>

                            {/* Loop Gap (Conditional) */}
                            {isLoop && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Loop Spacing</span>
                                        <span>{currentGap}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={currentGap}
                                        onChange={(e) => updateConfig('gap', parseInt(e.target.value))}
                                        className="w-full h-1 bg-black/40 rounded-full appearance-none accent-green-500 cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSaveBranding}
                            disabled={isSavingBranding}
                            className="w-full py-4 rounded-[20px] bg-gradient-to-r from-mystic-accent to-pink-500 font-bold text-white shadow-liquid hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isSavingBranding ? <RefreshCw className="animate-spin" /> : <Save size={18} />} Save Branding
                        </button>

                        {/* Add Reference Image Button */}
                        {userId && (
                            <button
                                onClick={() => setShowRefForm(true)}
                                className="w-full py-3 rounded-[16px] bg-white/5 border border-white/10 font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <ImagePlus size={18} /> Thêm ảnh tham chiếu
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Reference Image Form Modal */}
            {showRefForm && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md p-6 space-y-5 relative">
                        <button
                            onClick={() => setShowRefForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <ImagePlus size={22} className="text-purple-400" />
                            Thêm ảnh tham chiếu
                        </h3>

                        {/* Image URL */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">URL Ảnh *</label>
                            <input
                                type="text"
                                value={refImageUrl}
                                onChange={(e) => setRefImageUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>

                        {/* Prompt */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Prompt</label>
                            <textarea
                                value={refPrompt}
                                onChange={(e) => setRefPrompt(e.target.value)}
                                placeholder="Mô tả về ảnh..."
                                rows={3}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                            />
                        </div>

                        {/* Image Type Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Image Type *</label>
                            <select
                                value={refImageType}
                                onChange={(e) => setRefImageType(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="studio">Studio</option>
                                <option value="creative">Creative</option>
                                <option value="poster">Poster</option>
                                <option value="4k">4K</option>
                                <option value="upscaled">Upscaled</option>
                            </select>
                        </div>

                        {/* Category Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Category</label>
                            <select
                                value={refCategoryId || ''}
                                onChange={(e) => setRefCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                            >
                                <option value="">-- Không chọn --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Preview */}
                        {refImageUrl && (
                            <div className="rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                <img src={refImageUrl} alt="Preview" className="w-full max-h-40 object-contain" />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmitRefImage}
                            disabled={isSubmitting || !refImageUrl}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                            {isSubmitting ? 'Đang thêm...' : 'Thêm ảnh'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};