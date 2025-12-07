import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Process from './components/Process';
import Comparison from './components/Comparison';
import Pricing from './components/Pricing';
import Footer from './components/Footer';

interface LandingPageProps {
  onEnterStudio: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterStudio }) => {
  return (
    <div className="min-h-screen bg-[#030303] selection:bg-purple-500/30 selection:text-white overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Navbar onEnterStudio={onEnterStudio} />
        <main>
          <Hero onEnterStudio={onEnterStudio} />
          <Process />
          <Comparison />
          <Pricing hidePurchaseOptions={true} />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;