import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

const navLinks = [


];

interface NavbarProps {
  onEnterStudio: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onEnterStudio }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b border-white/0 ${isScrolled ? 'glass-panel border-white/5 py-4' : 'bg-transparent py-6'
        }`}
    >

      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 group cursor-pointer" onClick={onEnterStudio}>
          <img src="/textlogo.png" alt="WinDiStudio" className="h-16 object-contain" />
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="primary" className="py-2 px-5 text-xs" onClick={onEnterStudio}>
            Bắt đầu ngay <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 glass-panel border-t border-white/10 p-6 flex flex-col gap-4 animate-in slide-in-from-top-5">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-gray-300 hover:text-white py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <div className="h-px bg-white/10 my-2" />
          <a href="#" className="text-center text-gray-300 py-2" onClick={(e) => { e.preventDefault(); onEnterStudio(); }}>Đăng nhập</a>
          <Button variant="primary" className="w-full" onClick={onEnterStudio}>Bắt đầu ngay</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;