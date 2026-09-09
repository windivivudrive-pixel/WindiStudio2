import type {Metadata} from 'next';
import {VoiceStudio} from '@/windi/voice-studio';
import '@/windi/voice-studio.css';
export const metadata:Metadata={title:'Voice Studio — Clone giọng có biểu cảm theo ngữ cảnh',description:'Nghe 5 bản so sánh và trải nghiệm Clone Pro 2.1: giữ chất giọng riêng, bắt nhịp lời thoại và tạo giọng đọc tự nhiên cho video, podcast, kể chuyện.'};
export default function Page(){return <VoiceStudio/>;}
