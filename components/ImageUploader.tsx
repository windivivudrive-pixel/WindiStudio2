import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  subLabel?: string;
  image: string | null; // Base64 with prefix
  onImageChange: (base64: string | null) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ label, subLabel = "Upload Image", image, onImageChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full group">
      <label className="block text-xs font-bold text-gray-400 mb-2 ml-1 uppercase tracking-wider">{label}</label>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`
          relative w-full aspect-[3/4] rounded-[24px] cursor-pointer overflow-hidden transition-all duration-300
          ${image
            ? 'border-0 shadow-glow'
            : 'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:shadow-glass shadow-inner'}
        `}
      >
        {image ? (
          <>
            <img src={image} alt="Preview" className="w-full h-full object-contain bg-black/20" />

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/10 pointer-events-none" />

            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white transition-colors border border-white/10 shadow-lg"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent backdrop-blur-[2px]">
              <p className="text-[10px] text-center text-white/90 font-medium tracking-wide uppercase">{subLabel}</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 group-hover:text-mystic-accent transition-colors p-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 shadow-glass-inset border border-white/5 group-hover:scale-110 transition-transform duration-300">
              <Upload size={20} className="opacity-80" />
            </div>
            <p className="text-xs font-semibold text-center text-gray-300">{subLabel}</p>
            <p className="text-[10px] text-gray-500 mt-1">Tap to select</p>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
};