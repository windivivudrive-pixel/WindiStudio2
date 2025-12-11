import React from 'react';
import { Instagram, Facebook, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 border-t border-white/10 bg-black text-gray-500 text-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">

        <div className="flex flex-col items-center md:items-start gap-2">
          <p>© 2025 WinDiStudio by WinDiViVu</p>
        </div>

        <div className="flex gap-8">
          <a href="?view=terms" className="hover:text-white transition-colors">Điều khoản sử dụng</a>
          <a href="?view=privacy" className="hover:text-white transition-colors">Chính sách bảo mật</a>
        </div>

        {/* <div className="flex gap-4">
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Instagram className="w-4 h-4" />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Facebook className="w-4 h-4" />
          </a>
          <a href="#" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all">
            <Twitter className="w-4 h-4" />
          </a>
        </div> */}

      </div>
    </footer>
  );
};

export default Footer;