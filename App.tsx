import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { signInWithGoogle, signOut, fetchProducts, createCommerceOrder } from './services/supabaseService';
import { Product, Order, UserProfile } from './types';
import { CreatorFlowLanding } from './components/CreatorFlowLanding';
import { Checkout } from './components/Checkout';
import { Dashboard } from './components/Dashboard';
import { Admin } from './components/Admin';
import { LogIn, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'LANDING' | 'CHECKOUT' | 'DASHBOARD' | 'ADMIN'>('LANDING');
  
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
    });

    // Fetch Products
    fetchProducts().then(setProducts);

    // Initial Routing from URL
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    if (view === 'dashboard') setCurrentView('DASHBOARD');
    else if (view === 'admin') setCurrentView('ADMIN');

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setUserProfile(data as any);
      setIsAdmin(data.role === 'admin' || data.email === 'quochungdn151@gmail.com');
    }
  };

  const navigateTo = (view: typeof currentView) => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view.toLowerCase());
    window.history.pushState({}, '', url.toString());
  };

  const handleLogin = async () => {
    await signInWithGoogle();
  };

  const handleLogout = async () => {
    await signOut();
    navigateTo('LANDING');
  };

  const handleBuy = (type: 'STUDIO_LICENSE' | 'VOICE_UNITS') => {
    const defaultProduct = products.find(p => p.type === type);
    if (!defaultProduct) {
      alert("Sản phẩm chưa có sẵn");
      return;
    }
    
    if (!session) {
      alert("Vui lòng đăng nhập trước khi mua hàng.");
      handleLogin();
      return;
    }

    setSelectedProducts([defaultProduct]);
    setCurrentOrder(null);
    navigateTo('CHECKOUT');
  };

  const handlePlaceOrder = async (productIds: string[]) => {
    if (!session) {
      handleLogin();
      return;
    }

    const result = await createCommerceOrder(productIds);
    if (result && result.success) {
      setCurrentOrder(result.order);
    } else {
      alert("Lỗi tạo đơn hàng: " + (result?.error || 'Unknown error'));
    }
  };

  return (
    <div className="font-sans antialiased text-gray-900 bg-black min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="text-white font-bold text-xl tracking-tight cursor-pointer"
            onClick={() => navigateTo('LANDING')}
          >
            CreatorFlow<span className="text-purple-500">.</span>
          </div>
          
          <div className="flex items-center gap-4">
            {session ? (
              <>
                <button 
                  onClick={() => navigateTo('DASHBOARD')}
                  className={`flex items-center gap-2 text-sm font-medium ${currentView === 'DASHBOARD' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <LayoutDashboard size={18} /> Dashboard
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => navigateTo('ADMIN')}
                    className={`flex items-center gap-2 text-sm font-medium ${currentView === 'ADMIN' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'}`}
                  >
                    <ShieldCheck size={18} /> Admin
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
                >
                  <LogOut size={18} /> Thoát
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
              >
                <LogIn size={16} /> Đăng nhập
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main View Area */}
      <main>
        {currentView === 'LANDING' && (
          <CreatorFlowLanding 
            onBuyStudio={() => handleBuy('STUDIO_LICENSE')}
            onBuyVoice={() => handleBuy('VOICE_UNITS')}
          />
        )}
        
        {currentView === 'CHECKOUT' && (
          <Checkout 
            products={products}
            selectedProducts={selectedProducts}
            order={currentOrder}
            onBack={() => navigateTo('LANDING')}
            onPlaceOrder={handlePlaceOrder}
          />
        )}

        {currentView === 'DASHBOARD' && (
          session ? <Dashboard /> : (
            <div className="min-h-screen flex items-center justify-center text-white pt-24">
              Vui lòng đăng nhập để xem dashboard.
            </div>
          )
        )}

        {currentView === 'ADMIN' && (
          isAdmin ? <Admin /> : (
            <div className="min-h-screen flex items-center justify-center text-white pt-24">
              Không có quyền truy cập.
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;
