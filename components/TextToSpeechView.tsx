import React, { useState, useRef } from 'react';
import { Volume2, Wand2, Download, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface TextToSpeechViewProps {
  userProfile: any;
  setUserProfile: (profile: any) => void;
}

export const TextToSpeechView: React.FC<TextToSpeechViewProps> = ({ userProfile, setUserProfile }) => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [voice, setVoice] = useState('iapetus');
  const [styleInstruction, setStyleInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const costPerAudio = 2; // Arbitrary cost for TTS

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter some text to synthesize.');
      return;
    }

    if (userProfile && userProfile.credits < costPerAudio) {
      setError(`Insufficient balance. Cost: ${costPerAudio} xu, Available: ${userProfile.credits} xu.`);
      return;
    }

    setError(null);
    setIsGenerating(true);
    setAudioUrl(null);

    try {
      const resultUrl = await generateSpeech(text, language, voice, styleInstruction);
      setAudioUrl(resultUrl);

      // Deduct credits
      if (userProfile) {
        const newBalance = userProfile.credits - costPerAudio;
        setUserProfile({ ...userProfile, credits: newBalance });
        // NOTE: In a real app, you would also update this to the database
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate speech. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 md:p-8 overflow-y-auto w-full max-w-4xl mx-auto">
      <div className="w-full bg-[#130f25]/80 backdrop-blur-lg rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Volume2 className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Text to Speech</h2>
            <p className="text-gray-400 text-sm">Powered by Gemini 3.1 Flash TTS Preview</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Input Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text here to convert to natural-sounding speech..."
              className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none placeholder-gray-600 transition-all"
            />
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs text-gray-500">{text.length} characters</span>
              {userProfile && (
                <span className="text-xs font-medium text-yellow-500">Cost: {costPerAudio} xu</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
              >
                <option value="vi">Vietnamese (Tiếng Việt)</option>
                <option value="en">English (Tiếng Anh)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
              >
                <option value="iapetus">Iapetus (Male)</option>
                <option value="leda">Leda (Female)</option>
                <option value="Aoede">Aoede (Female)</option>
                <option value="Charon">Charon (Male)</option>
                <option value="Fenrir">Fenrir (Male)</option>
                <option value="Kore">Kore (Female)</option>
                <option value="Puck">Puck (Male)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Style Instructions (Optional)</label>
            <input
              type="text"
              value={styleInstruction}
              onChange={(e) => setStyleInstruction(e.target.value)}
              placeholder="e.g. Speak slowly and clearly, emphasize the word 'important'"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-gray-600"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !text.trim()}
              className={`
                relative group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-white transition-all duration-300
                ${isGenerating || !text.trim()
                  ? 'bg-gray-700/50 cursor-not-allowed opacity-70'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-[1.02]'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  <span>Synthesizing Voice...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>Generate Audio</span>
                  <Sparkles size={16} className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </div>

          {audioUrl && (
            <div className="mt-8 p-6 bg-black/40 border border-white/10 rounded-2xl animate-fade-in-up">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <Volume2 size={16} className="text-purple-400" />
                Generated Result
              </h3>
              
              <div className="flex flex-col md:flex-row items-center gap-4">
                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full [&::-webkit-media-controls-panel]:bg-gray-800 [&::-webkit-media-controls-panel]:text-white"
                />
                
                <a
                  href={audioUrl}
                  download="speech_windi_studio.mp3"
                  className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors text-white text-sm font-medium"
                >
                  <Download size={16} />
                  <span className="hidden md:inline">Download</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
