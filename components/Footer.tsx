import React from 'react';
import { Instagram, Facebook, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/10 bg-black text-gray-500 text-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                W
             </div>
             <span className="font-display font-semibold text-white">WinDiStudio</span>
          </div>
          <p>© 2024 WinDiStudio Inc. All rights reserved.</p>
        </div>

        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
          <a href="#" className="hover:text-white transition-colors">Chính sách bảo mật</a>
          <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
        </div>

        <div className="flex gap-4">
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Instagram className="w-4 h-4" />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Facebook className="w-4 h-4" />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Twitter className="w-4 h-4" />
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;