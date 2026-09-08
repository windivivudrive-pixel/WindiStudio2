import React, { useState, useEffect } from 'react';
import { Check, Loader, ArrowLeft, Copy } from 'lucide-react';
import { Product, Order } from '../types';
import Button from './ui/Button';
import { supabase } from '../services/supabaseClient';

interface Props {
  products: Product[];
  selectedProducts: Product[];
  order: Order | null;
  onBack: () => void;
  onPlaceOrder: (productIds: string[]) => void;
}

export const Checkout: React.FC<Props> = ({ products, selectedProducts, order, onBack, onPlaceOrder }) => {
  const [isPolling, setIsPolling] = useState(false);

  const total = selectedProducts.reduce((sum, p) => sum + p.price_vnd, 0);

  // Poll for order status if order exists
  useEffect(() => {
    if (!order) return;
    
    let interval: any;
    if (order.status === 'PENDING') {
      interval = setInterval(async () => {
        const { data } = await supabase.from('orders').select('status').eq('id', order.id).single();
        if (data && data.status === 'PAID') {
          // Success! 
          window.location.reload(); // Refresh to dashboard
        }
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [order]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Order Summary</h2>
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 space-y-4">
              {selectedProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-400">{p.type === 'STUDIO_LICENSE' ? 'Lifetime License' : 'Voice Quota'}</div>
                  </div>
                  <div className="font-bold">{p.price_vnd.toLocaleString('vi-VN')}đ</div>
                </div>
              ))}
              
              <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-xl font-medium text-gray-300">Total</span>
                <span className="text-2xl font-bold text-white">{total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {!order && (
              <Button 
                onClick={() => onPlaceOrder(selectedProducts.map(p => p.id))} 
                className="w-full mt-6 bg-purple-600 hover:bg-purple-700 h-14 text-lg"
              >
                Proceed to Payment
              </Button>
            )}
          </div>

          {/* Payment Section */}
          {order && (
            <div>
              <h2 className="text-3xl font-bold mb-6">Payment</h2>
              <div className="bg-white rounded-3xl p-8 text-black text-center shadow-2xl">
                <h3 className="font-bold text-xl mb-2">VietQR Transfer</h3>
                <p className="text-gray-500 mb-6 text-sm">Quét mã bằng ứng dụng ngân hàng của bạn</p>
                
                {/* Generate VietQR - Assuming TPB and Account from existing config */}
                <img 
                  src={`https://img.vietqr.io/image/TPB-55111685555-compact.png?amount=${order.total_amount_vnd}&addInfo=${order.payment_code}&accountName=BUI QUOC HUNG`}
                  alt="QR Code"
                  className="w-64 h-64 mx-auto mb-6 border rounded-xl p-2"
                />

                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Số tiền</span>
                    <span className="font-bold">{order.total_amount_vnd.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Ngân hàng</span>
                    <span className="font-medium">TPBank</span>
                  </div>
                  <div className="flex justify-between items-center cursor-pointer group" onClick={() => copyToClipboard('55111685555')}>
                    <span className="text-gray-500 text-sm">Số tài khoản</span>
                    <span className="font-medium flex items-center gap-1 group-hover:text-blue-600">
                      55111685555 <Copy size={14}/>
                    </span>
                  </div>
                  <div className="flex justify-between items-center cursor-pointer group" onClick={() => copyToClipboard(order.payment_code)}>
                    <span className="text-gray-500 text-sm">Nội dung (BẮT BUỘC)</span>
                    <span className="font-bold text-purple-600 flex items-center gap-1">
                      {order.payment_code} <Copy size={14}/>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-purple-700 font-medium bg-purple-50 py-3 rounded-lg">
                  <Loader className="animate-spin" size={18} />
                  Đang chờ thanh toán...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
