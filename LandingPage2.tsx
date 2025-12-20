import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/HeroMain';
import Process from './components/ProcessMain';
import Comparison from './components/Comparison';
// import Pricing from './components/Pricing'; // HIDDEN - Re-enable later
import HolidayCampaign from './components/HolidayCampaign';
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
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;