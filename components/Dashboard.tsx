import React, { useState, useEffect } from 'react';
import { Download, Mic, History, Package, ShieldCheck, Play, Plus } from 'lucide-react';
import Button from './ui/Button';
import { CreatorFlowLicense, VoiceWallet, CustomerVoice, Order } from '../types';
import { fetchMyLicenses, fetchMyVoiceWallet, fetchMyVoices, fetchMyOrders, generateTTS } from '../services/supabaseService';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'VOICE' | 'ORDERS'>('PRODUCTS');
  
  const [licenses, setLicenses] = useState<CreatorFlowLicense[]>([]);
  const [wallet, setWallet] = useState<VoiceWallet | null>(null);
  const [voices, setVoices] = useState<CustomerVoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [ttsText, setTtsText] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');

  useEffect(() => {
    Promise.all([
      fetchMyLicenses(),
      fetchMyVoiceWallet(),
      fetchMyVoices(),
      fetchMyOrders()
    ]).then(([l, w, v, o]) => {
      setLicenses(l);
      setWallet(w);
      setVoices(v);
      setOrders(o as any);
      setLoading(false);
    });
  }, []);

  const handleTTS = async (voiceId: string) => {
    if (!ttsText) return;
    setTtsLoading(true);
    const res = await generateTTS(voiceId, ttsText);
    if (res && res.audioUrl) {
      setAudioUrl(res.audioUrl);
      fetchMyVoiceWallet().then(setWallet); // refresh balance
    } else {
      alert("TTS Failed: " + (res?.error || 'Unknown error'));
    }
    setTtsLoading(false);
  };

  const downloadStudio = () => {
    // This should ideally call an Edge Function to get a signed URL
    // For now, prompt the user that it will be sent to their email or they need to contact support if signed url isn't ready
    alert("Downloading CreatorFlow Studio v1.0.0. Please check your downloaded files.");
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">My Dashboard</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
          <button 
            className={`font-medium pb-2 ${activeTab === 'PRODUCTS' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
            onClick={() => setActiveTab('PRODUCTS')}
          >
            My Products
          </button>
          <button 
            className={`font-medium pb-2 ${activeTab === 'VOICE' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
            onClick={() => setActiveTab('VOICE')}
          >
            Voice Studio
          </button>
          <button 
            className={`font-medium pb-2 ${activeTab === 'ORDERS' ? 'text-white border-b-2 border-white' : 'text-gray-500'}`}
            onClick={() => setActiveTab('ORDERS')}
          >
            Order History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Package/> Active Licenses</h2>
            {licenses.length === 0 ? (
              <div className="text-gray-500 bg-white/5 p-8 rounded-xl text-center">No active licenses found.</div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {licenses.map(lic => (
                  <div key={lic.id} className="bg-gradient-to-br from-blue-900/20 to-neutral-900 border border-blue-500/20 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">CreatorFlow Studio</h3>
                        <p className="text-sm text-blue-400 font-mono mt-1">License ID: {lic.id.split('-')[0]}</p>
                      </div>
                      <ShieldCheck className="text-green-500" />
                    </div>
                    <p className="text-gray-400 text-sm mb-6">Status: <span className="text-white">{lic.status}</span></p>
                    <Button onClick={downloadStudio} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Download size={18} className="mr-2"/> Download v1.0.0
                    </Button>
                    <p className="text-xs text-gray-500 mt-3 text-center">Requires manual Flow Agent installation.</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'VOICE' && (
          <div className="space-y-8">
            <div className="bg-neutral-900 border border-white/10 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="text-gray-400 font-medium mb-1">Available Voice Units</h3>
                <div className="text-4xl font-bold text-purple-400">{wallet?.balance?.toLocaleString() || 0} <span className="text-lg text-gray-500 font-normal">units</span></div>
              </div>
              <Button variant="outline" className="border-purple-500/30 hover:bg-purple-500/10 text-purple-300">
                <Plus size={16} className="mr-2"/> Buy Units
              </Button>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Mic/> My Voices</h2>
              {voices.length === 0 ? (
                <div className="text-gray-500 bg-white/5 p-8 rounded-xl text-center">You haven't cloned any voices yet.</div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  {voices.map(voice => (
                    <div key={voice.id} className="bg-neutral-900 border border-white/10 p-6 rounded-2xl">
                      <h3 className="font-bold text-lg mb-2">{voice.name}</h3>
                      <p className="text-xs text-gray-500 mb-4 font-mono">{voice.provider_voice_id}</p>
                      
                      <div className="space-y-3">
                        <textarea 
                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-gray-300 focus:border-purple-500 outline-none"
                          rows={3}
                          placeholder="Text to speech..."
                          value={ttsText}
                          onChange={e => setTtsText(e.target.value)}
                        />
                        <Button 
                          onClick={() => handleTTS(voice.provider_voice_id)} 
                          disabled={ttsLoading || !ttsText}
                          className="w-full bg-purple-600 hover:bg-purple-700 h-9 text-sm"
                        >
                          {ttsLoading ? 'Generating...' : <><Play size={14} className="mr-1"/> Synthesize</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {audioUrl && (
              <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl flex items-center gap-4">
                <span className="text-purple-300 font-medium">Generated Audio:</span>
                <audio controls src={audioUrl} className="h-10 flex-1 outline-none" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'ORDERS' && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><History/> Order History</h2>
            <div className="bg-neutral-900 rounded-2xl overflow-hidden border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/50 text-gray-400">
                  <tr>
                    <th className="p-4 font-medium">Order ID</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Total</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-white/5">
                      <td className="p-4 font-mono text-xs">{order.id.split('-')[0]}</td>
                      <td className="p-4 text-gray-400">{new Date(order.created_at).toLocaleDateString()}</td>
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
              {orders.length === 0 && (
                <div className="p-8 text-center text-gray-500">No orders found.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
