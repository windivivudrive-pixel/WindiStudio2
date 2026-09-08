import type {Metadata} from 'next';
import {VoiceStudio} from '@/windi/voice-studio';
import '@/windi/voice-studio.css';
export const metadata:Metadata={title:'Voice Studio — Tạo & clone giọng AI',description:'Nhận 1.500 credit khi đăng ký, clone giọng đầu tiên từ 29.000đ và tạo giọng đọc với Clone Pro 2.1.'};
export default function Page(){return <VoiceStudio/>;}
