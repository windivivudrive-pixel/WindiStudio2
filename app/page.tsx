import type { Metadata } from 'next';
import { VoiceStudio } from '@/windi/voice-studio';
import { VoiceStudioGuide } from '@/windi/voice-studio-guide';
import { voiceStudioMetadata, voiceStudioStructuredData } from '@/lib/voice/seo';
import '@/windi/voice-studio.css';

export const metadata: Metadata = voiceStudioMetadata;

export default function Page() {
  return <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(voiceStudioStructuredData).replace(/</g, '\\u003c') }}
    />
    <VoiceStudio><VoiceStudioGuide /></VoiceStudio>
  </>;
}
