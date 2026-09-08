import { ArrowUpRight, CircleAlert, Rocket, Sparkles } from 'lucide-react';
import { type CreatorBrief } from '@/lib/creator-catalog';
import { externalHttps } from '@/lib/community-evidence';
import { RetroWindow } from './ui/retro';

export function CreatorGuide({ brief, sourceUrl }: { brief: CreatorBrief; sourceUrl: string }) {
  return <div id="bat-dau" style={{scrollMarginTop:100}}><RetroWindow title="BẮT ĐẦU DÀNH CHO NGƯỜI MỚI" accent="green">
    <div className="beginner-guide">
      <section className="guide-step"><span className="guide-number">01</span><div><h3><Sparkles size={17} /> Dùng khi nào?</h3><p>{brief.example}</p></div></section>
      <section className="guide-step"><span className="guide-number">02</span><div><h3><Rocket size={17} /> Bắt đầu ra sao?</h3><p>{brief.setup}</p>{externalHttps(sourceUrl) && <a className="text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Mở hướng dẫn cài đặt chính chủ <ArrowUpRight size={15} /></a>}</div></section>
      <section className="guide-step"><span className="guide-number">03</span><div><h3><CircleAlert size={17} /> Cần biết trước khi dùng</h3><p>{brief.limitations}</p></div></section>
    </div>
  </RetroWindow></div>;
}
