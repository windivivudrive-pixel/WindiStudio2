'use client';

import { Check, Copy, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from './language-mode';
import { RetroButton, RetroWindow } from './ui/retro';

export type EasyPrompt = {
  promptVi: string;
  promptEn: string;
  sourceUrl: string;
  generatedAt?: string | null;
};

export function EasyPromptCard({ prompt }: { prompt: EasyPrompt }) {
  const { language, setLanguage } = useLanguage();
  const [copied, setCopied] = useState(false);
  const isEnglish = language === 'en';
  const text = isEnglish ? prompt.promptEn : prompt.promptVi;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopied(false); }
  };
  return <RetroWindow title="EASY PROMPT" accent="orange" className="easy-prompt-window">
    <div data-windi-no-translate className="easy-prompt-head">
      <div><p className="easy-prompt-kicker"><Sparkles size={15} /> {isEnglish ? 'READY FOR YOUR AI' : 'SẴN SÀNG CHO AI CỦA BẠN'}</p><p>{isEnglish ? 'Copy into Gemini, Codex or Claude. Your AI checks the setup and asks for the input it needs.' : 'Copy vào Gemini, Codex hoặc Claude. AI sẽ kiểm tra cách dùng và hỏi thông tin cần thiết để bắt đầu.'}</p></div>
      <div className="easy-prompt-language" role="group" aria-label="Easy Prompt language"><button className={!isEnglish ? 'is-active' : ''} onClick={() => setLanguage('vi')} type="button">VI</button><button className={isEnglish ? 'is-active' : ''} onClick={() => setLanguage('en')} type="button">EN</button></div>
    </div>
    <textarea data-windi-no-translate className="easy-prompt-text" readOnly aria-label={isEnglish ? 'Easy Prompt in English' : 'Easy Prompt bằng tiếng Việt'} value={text} />
    <div data-windi-no-translate className="easy-prompt-actions"><RetroButton type="button" onClick={copy}>{copied ? <><Check size={15} /> {isEnglish ? 'Copied' : 'Đã sao chép'}</> : <><Copy size={15} /> {isEnglish ? 'Copy Easy Prompt' : 'Sao chép Easy Prompt'}</>}</RetroButton><a href={prompt.sourceUrl} target="_blank" rel="noopener noreferrer">{isEnglish ? 'Official source ↗' : 'Nguồn chính chủ ↗'}</a></div>
  </RetroWindow>;
}
