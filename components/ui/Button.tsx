import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'glass' | 'liquid';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-all duration-300 text-sm tracking-wide active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    // Updated to match the "GENERATE" button in the app screenshot (Purple -> Pink Gradient)
    primary: "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:brightness-110 border border-transparent",
    
    secondary: "bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/40",
    
    glass: "glass-panel text-white hover:bg-white/10 hover:border-white/30",
    
    // Liquid Glass: High gloss, semi-transparent, inset highlight
    liquid: "backdrop-blur-xl bg-gradient-to-b from-white/10 to-transparent border border-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_10px_20px_-10px_rgba(0,0,0,0.5)] hover:bg-white/10 hover:border-white/40 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6),0_15px_25px_-10px_rgba(0,0,0,0.6)] hover:-translate-y-0.5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;