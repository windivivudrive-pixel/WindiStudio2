import React from 'react';

interface StudioTabsProps {
  activeTab: 'studio' | 'creative' | 'library' | 'tts';
  onTabChange: (tab: 'studio' | 'creative' | 'library' | 'tts') => void;
}

export const StudioTabs: React.FC<StudioTabsProps> = ({ activeTab, onTabChange }) => {
  // Calculate position based on active tab (Creative first, Studio second, Library third)
  const getPosition = () => {
    switch (activeTab) {
      case 'creative': return '1%';
      case 'studio': return '34%';
      case 'library': return '67%';
      default: return '1%';
    }
  };

  return (
    <div className="relative flex w-[95%] max-w-[500px] mx-auto mt-1 md:mt-2 mb-1 md:mb-2 p-1 bg-[#0f0c1d]/80 backdrop-blur-md rounded-full border border-white/10 shadow-glass-sm">
      {/* Sliding Gradient Background */}
      {activeTab !== 'tts' && (
        <div
          className="absolute top-1 bottom-1 w-[32%] rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 shadow-glow transition-all duration-700 ease-[cubic-bezier(0.34,1.1,0.54,1)] z-0"
          style={{
            left: getPosition(),
            transform: 'translateX(0)'
          }}
        />
      )}

      {/* Buttons - Creative first, Studio second, Library third */}
      <button
        onClick={() => onTabChange('creative')}
        className={`relative z-10 flex-1 py-1.5 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'creative' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Creative
      </button>
      <button
        onClick={() => onTabChange('studio')}
        className={`relative z-10 flex-1 py-1.5 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'studio' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Studio
      </button>
      <button
        onClick={() => onTabChange('library')}
        className={`relative z-10 flex-1 py-1.5 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'library' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Library
      </button>
    </div>
  );
};

