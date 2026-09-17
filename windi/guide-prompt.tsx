'use client';
import {useState} from 'react';
export function GuidePrompt({children}:{children:string}){
 const [message,setMessage]=useState('');
 return <div className="wg-prompt"><span>MẪU CÂU CỦA BẠN</span><p>{children}</p><button onClick={async()=>{try{await navigator.clipboard.writeText(children);setMessage('Đã sao chép');}catch{setMessage('Hãy chọn và sao chép đoạn văn bên trên.');}}}>Sao chép mẫu câu</button><small role="status">{message}</small></div>;
}
