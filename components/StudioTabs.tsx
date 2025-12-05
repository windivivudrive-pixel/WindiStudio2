import React from 'react';

interface StudioTabsProps {
  activeTab: 'studio' | 'fun' | 'library';
  onTabChange: (tab: 'studio' | 'fun' | 'library') => void;
}

export const StudioTabs: React.FC<StudioTabsProps> = ({ activeTab, onTabChange }) => {
  // Calculate position based on active tab
  const getPosition = () => {
    switch (activeTab) {
      case 'studio': return '6px';
      case 'fun': return 'calc(33.33% + 4px)';
      case 'library': return 'calc(66.66% + 2px)';
      default: return '6px';
    }
  };

  return (
    <div className="relative flex w-[90%] max-w-[450px] mx-auto mb-3 md:mb-6 p-1.5 bg-[#0f0c1d]/80 backdrop-blur-md rounded-full border border-white/10 shadow-glass-sm">
      {/* Sliding Gradient Background */}
      <div
        className="absolute top-1.5 bottom-1.5 w-[calc(33.33%-6px)] rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 shadow-glow transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0"
        style={{
          left: getPosition(),
          transform: 'translateX(0)'
        }}
      />

      {/* Buttons */}
      <button
        onClick={() => onTabChange('studio')}
        className={`relative z-10 flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'studio' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Studio
      </button>
      <button
        onClick={() => onTabChange('fun')}
        className={`relative z-10 flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'fun' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Fun
      </button>
      <button
        onClick={() => onTabChange('library')}
        className={`relative z-10 flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-center transition-colors duration-500 ${activeTab === 'library' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Library
      </button>
    </div>
  );
};
