
import React, { useState } from 'react';
import { Gift, BadgeCheck, ArrowRight, Sparkles, Star, Crown } from 'lucide-react';
import Button from './ui/Button';
import RegistrationModal from './RegistrationModal';

const HolidayCampaign: React.FC = () => {
    // Progress bar logic for FOMO (142/200)
    const totalSlots = 50;
    const claimedSlots = 8;
    const percentage = (claimedSlots / totalSlots) * 100;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'shop' | 'creator'>('shop');

    const openModal = (type: 'shop' | 'creator') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    return (
        <section className="py-24 relative overflow-hidden bg-[#050505] border-t border-white/5">
            {/* Holiday Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-1/4 w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-1/4 w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-4 animate-fade-in">
                        <Sparkles className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs font-bold text-red-300 uppercase tracking-widest">Ưu Đãi Mùa Lễ Hội</span>
                        <Sparkles className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-display font-semibold mb-4">
                        Ưu đãi đặc biệt <br className="md:hidden" />
                        <span className="text-gradient-gold">Giáng Sinh & Tết 2025</span>
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Cơ hội vàng để bứt phá doanh số cuối năm với chi phí hình ảnh = 0đ.
                    </p>
                </div>

                {/* Tab Selection */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex p-1.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <button
                            onClick={() => setModalType('shop')}
                            className={`relative px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${modalType === 'shop'
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Gift className="w-4 h-4" />
                                Chủ Shop
                            </span>
                            {modalType === 'shop' && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setModalType('creator')}
                            className={`relative px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 ${modalType === 'creator'
                                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/25'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <BadgeCheck className="w-4 h-4" />
                                Creators
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content Area - Only show selected tab */}
                <div className="max-w-2xl mx-auto">
                    {/* SHOP OWNERS TAB */}
                    {modalType === 'shop' && (
                        <div className="relative group rounded-3xl p-1 bg-gradient-to-b from-red-500/20 via-white/5 to-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="absolute inset-0 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-colors duration-500"></div>

                            <div className="relative h-full bg-[#0A0A0A] rounded-[22px] p-8 md:p-10 border border-white/10 overflow-hidden flex flex-col">
                                {/* Decorative Ribbon/Badge */}
                                <div className="absolute top-6 right-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-red-500 blur-lg opacity-50 animate-pulse"></div>
                                        <Gift className="relative w-12 h-12 text-red-400" />
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                                        Quà Tặng Shop Mới <br />
                                        <span className="text-red-400">Giáng Sinh & Tết 🎁</span>
                                    </h3>
                                    <p className="text-gray-400 mt-4 text-lg">
                                        Nhận ngay <strong className="text-white">500 Xu Miễn Phí</strong> (Trị giá 500k) để trải nghiệm tạo ảnh Lookbook không giới hạn.
                                    </p>
                                </div>

                                {/* FOMO Progress Bar */}
                                <div className="bg-white/5 rounded-xl p-5 mb-8 border border-white/5">
                                    <div className="flex justify-between text-sm font-medium mb-2">
                                        <span className="text-red-300 flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            Đang diễn ra
                                        </span>
                                        <span className="text-gray-400">Đã nhận: <span className="text-white">{claimedSlots}/{totalSlots}</span></span>
                                    </div>

                                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-1000 ease-out relative"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <div className="absolute top-0 right-0 bottom-0 w-[20px] bg-white/20 skew-x-[-20deg] animate-[shimmer_1s_infinite]"></div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 italic">*Chỉ dành cho 50 Shop đăng ký sớm nhất.</p>
                                </div>

                                <div className="mt-auto">
                                    <Button
                                        variant="primary"
                                        className="w-full h-14 text-lg shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_-10px_rgba(239,68,68,0.6)] animate-[pulse_3s_ease-in-out_infinite]"
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        Nhận 500 Xu Ngay <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CREATORS TAB */}
                    {modalType === 'creator' && (
                        <div className="relative group rounded-3xl p-1 bg-gradient-to-b from-amber-200/20 via-white/5 to-transparent animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="absolute inset-0 bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-colors duration-500"></div>

                            <div className="relative h-full bg-[#0A0A0A] rounded-[22px] p-8 md:p-10 border border-white/10 overflow-hidden flex flex-col">
                                <div className="absolute top-6 right-6 bg-amber-500/10 p-3 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                    <BadgeCheck className="w-6 h-6 text-amber-300" />
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
                                        Dành cho Nhà Sáng Tạo<br />
                                        <span className="text-amber-200">Nội Dung (Creators)</span>
                                    </h3>
                                    <p className="text-gray-400 mt-4 text-lg">
                                        Trở thành đối tác truyền thông của <strong className="text-white">WinDiStudio</strong>.
                                    </p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shrink-0 shadow-lg">
                                            <Crown className="w-5 h-5 text-black fill-black" />
                                        </div>
                                        <h4 className="text-white font-medium">Nhận gói tài trợ Pro Creator để tạo hình AI Miễn Phí.</h4>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                            <Sparkles className="w-5 h-5 text-amber-200" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">Đặc quyền truy cập sớm</h4>
                                            <p className="text-sm text-gray-400 mt-0.5">Trải nghiệm các tính năng AI mới nhất.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                            <Star className="w-5 h-5 text-amber-200" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">Cơ chế Affiliate hấp dẫn</h4>
                                            <p className="text-sm text-gray-400 mt-0.5">Chia sẻ doanh thu không giới hạn.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <Button
                                        variant="glass"
                                        className="w-full h-14 text-lg border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40 text-amber-100 tracking-wide"
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        Đăng ký Partner
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Registration Modal */}
            <RegistrationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                type={modalType}
            />
        </section>
    );
};

export default HolidayCampaign;
