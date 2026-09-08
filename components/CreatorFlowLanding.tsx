import React from 'react';
import { Sparkles, Mic, Download, CheckCircle, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

interface Props {
  onBuyStudio: () => void;
  onBuyVoice: () => void;
}

export const CreatorFlowLanding: React.FC<Props> = ({ onBuyStudio, onBuyVoice }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-8">
            <Sparkles size={14} />
            <span>Introducing CreatorFlow Commerce</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            The Ultimate Toolkit for <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Modern Creators
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Get access to CreatorFlow Studio for advanced local workflows and CreatorFlow Voice for premium AI voice generation.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={onBuyStudio} className="bg-white text-black hover:bg-gray-200 h-12 px-8 text-lg font-medium">
              Get CreatorFlow Studio
            </Button>
            <Button onClick={onBuyVoice} className="bg-purple-600 hover:bg-purple-700 h-12 px-8 text-lg font-medium border-0">
              Buy Voice Units
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16">
            
            {/* Studio Feature */}
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Download className="text-blue-400" size={32} />
              </div>
              <h2 className="text-3xl font-bold">CreatorFlow Studio</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Download the standalone CreatorFlow Studio app for your desktop. Note: Flow Agent is an external dependency and must be installed separately.
              </p>
              <ul className="space-y-3">
                {['Lifetime access to v1.0.0', 'Local execution environment', 'Codex integration available'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="text-blue-500" size={20} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={onBuyStudio} variant="outline" className="mt-4 border-blue-500/30 hover:bg-blue-500/10">
                Purchase License - 500,000đ <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Voice Feature */}
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <Mic className="text-purple-400" size={32} />
              </div>
              <h2 className="text-3xl font-bold">CreatorFlow Voice</h2>
              <p className="text-gray-400 text-lg leading-relaxed">
                Premium Text-to-Speech and Voice Cloning powered by state-of-the-art models. Pay only for what you use with Voice Units.
              </p>
              <ul className="space-y-3">
                {['Instant Voice Cloning', 'Vietnamese Language Support', 'High-speed cloud rendering'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="text-purple-500" size={20} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={onBuyVoice} variant="outline" className="mt-4 border-purple-500/30 hover:bg-purple-500/10">
                View Voice Packages <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};
