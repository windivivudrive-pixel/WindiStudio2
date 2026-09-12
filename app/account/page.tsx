import type {Metadata} from 'next';
import {AccountPage} from '@/windi/account-page';
import '@/windi/voice-studio.css';
import '@/windi/account.css';
export const metadata:Metadata={title:'Hồ sơ của tôi — WindiStudio',robots:{index:false,follow:false}};
export default function Page(){return <AccountPage/>;}
