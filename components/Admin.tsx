import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Order } from '../types';

export const Admin: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin only fetching all orders
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({data}) => {
      if(data) setOrders(data as any);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-white p-8">Loading admin...</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-red-500">Admin Dashboard</h1>
        <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/50 text-gray-400">
              <tr>
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">User ID</th>
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-white/5">
                  <td className="p-4 font-mono text-xs">{order.id.split('-')[0]}</td>
                  <td className="p-4 font-mono text-xs text-gray-500">{order.user_id.split('-')[0]}</td>
                  <td className="p-4 font-bold text-yellow-500">{order.payment_code}</td>
                  <td className="p-4 font-medium">{order.total_amount_vnd.toLocaleString()}đ</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      order.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                      order.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      order.status === 'REVIEW_REQUIRED' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
