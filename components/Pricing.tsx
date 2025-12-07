import React, { useState } from 'react';
import { Check, Sparkles, Zap, Crown, ArrowRight, X, CreditCard, Copy } from 'lucide-react';
import Button from './ui/Button';

import { createTransaction } from '../services/supabaseService';
import { UserProfile } from '../types';

interface PricingProps {
    userProfile?: UserProfile | null;
    bankConfig?: {
        BANK_ID: string;
        ACCOUNT_NO: string;
        ACCOUNT_NAME: string;
        TEMPLATE: string;
    };
    onTransactionCreated?: (id: number) => void;
}

const DEFAULT_BANK_CONFIG = {
    BANK_ID: 'TPB',
    ACCOUNT_NO: '55111685555',
    ACCOUNT_NAME: 'BUI QUOC HUNG',
    TEMPLATE: 'compact'
};

const Pricing: React.FC<PricingProps> = ({ userProfile = null, bankConfig = DEFAULT_BANK_CONFIG, onTransactionCreated }) => {
    const [customInput, setCustomInput] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState(0);

    // Format currency input with dots (e.g., 100.000)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setCustomInput(formatted);
    };

    // Open QR Modal (For Pre-set Cards)
    const handleTopUpClick = async (amount: number) => {
        setSelectedAmount(amount);

        // Create PENDING transaction immediately
        if (userProfile) {
            let bonusMultiplier = 1;
            if (amount >= 3000000) {
                bonusMultiplier = 2; // +100%
            } else if (amount >= 1000000) {
                bonusMultiplier = 1.5; // +50%
            } else if (amount >= 50000) {
                bonusMultiplier = 1.2; // +20%
            }

            const baseCoins = Math.floor(amount / 1000);
            const calculatedCoins = Math.floor(baseCoins * bonusMultiplier);

            const tx = await createTransaction(
                userProfile.id,
                amount,
                calculatedCoins,
                `Payment: WINDI ${userProfile.payment_code}`,
                'PENDING',
                (bonusMultiplier - 1) * 100 // Pass bonus percentage (e.g., 0.2 * 100 = 20)
            );

            if (tx && onTransactionCreated) {
                onTransactionCreated(tx.id);
            }
        }

        setShowModal(true);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`Đã sao chép: ${text}`);
    };

    return (
        <section id="pricing" className="py-24 relative overflow-hidden bg-black/40">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-semibold mb-4">
                        Bảng giá <span className="text-gradient-gold">Nạp Credit</span>
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg font-light"> Mô hình nạp trước linh hoạt. Nạp càng nhiều, ưu đãi càng lớn.
                        <br className="hidden md:block" /> Bắt đầu trải nghiệm tạo hình bằng AI <span className="text-white font-bold text-2xl">chỉ từ 50K</span>

                    </p>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-12">
                    {/* Card 1: Starter */}
                    <div className="glass-panel p-8 rounded-3xl border border-white/5 relative group hover:border-white/20 transition-all duration-300 flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500/10 border border-green-500/50 text-green-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                            +20% Giá trị
                        </div>
                        <div className="text-center mb-8 pt-4">
                            <h3 className="text-xl font-medium text-white mb-2">Gói Trải Nghiệm</h3>
                            <div className="text-4xl font-bold text-white mb-1">500.000<span className="text-base font-normal text-gray-500 ml-1">đ</span></div>
                            <p className="text-sm text-gray-500 mt-2">Phù hợp cho shop nhỏ hoặc muốn test thử chất lượng.</p>
                        </div>
                        <ul className="space-y-4 mb-8 text-sm flex-grow">
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                                <span>Tổng nhận: <strong className="text-white">600.000đ</strong></span>
                            </li>

                        </ul>
                        <Button
                            variant="liquid"
                            className="w-full mt-auto group-hover:bg-green-500/10 group-hover:border-green-500/30 group-hover:shadow-[inset_0_1px_0_0_rgba(74,222,128,0.2)]"
                            onClick={() => handleTopUpClick(500000)}
                        >
                            Nạp 500k
                        </Button>
                    </div>

                    {/* Card 2: Professional (Highlight) */}
                    <div className="glass-panel p-8 rounded-3xl border border-purple-500/30 relative group shadow-[0_0_50px_-15px_rgba(168,85,247,0.2)] bg-gradient-to-b from-purple-900/10 to-transparent flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-purple-500/30">
                            +50% Giá trị
                        </div>

                        {/* Recommended Badge */}
                        <div className="absolute top-4 right-4 flex">
                            <span className="bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide">Khuyên dùng</span>
                        </div>

                        <div className="text-center mb-8 pt-4">
                            <h3 className="text-xl font-medium text-white mb-2 flex items-center justify-center gap-2">
                                Gói Chuyên Nghiệp <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400 animate-pulse" />
                            </h3>
                            <div className="text-4xl font-bold text-white mb-1">1.000.000<span className="text-base font-normal text-gray-500 ml-1">đ</span></div>
                            <p className="text-sm text-purple-200/80 mt-2">Dành cho shop ra mẫu đều đặn hàng tuần.</p>
                        </div>
                        <ul className="space-y-4 mb-8 text-sm flex-grow">
                            <li className="flex items-center gap-3 text-white">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-purple-400" /></div>
                                <span>Tổng nhận: <strong className="text-purple-300 text-lg">1.500.000đ</strong></span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-purple-400" /></div>
                                <span>Tiết kiệm 500k so với gói thường</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-purple-400" /></div>
                                <span>Tặng Tính Năng Thêm Watermark Tự Động</span>
                            </li>
                        </ul>
                        <Button
                            variant="liquid"
                            className="w-full mt-auto font-bold text-purple-100 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.4),0_10px_20px_-10px_rgba(168,85,247,0.3)]"
                            onClick={() => handleTopUpClick(1000000)}
                        >
                            Nạp 1 Triệu
                        </Button>
                    </div>

                    {/* Card 3: Agency (VIP) */}
                    <div className="glass-panel p-8 rounded-3xl border border-yellow-500/20 relative group hover:border-yellow-500/40 transition-all duration-300 flex flex-col">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-yellow-500/20">
                            X2 Tài Khoản
                        </div>
                        <div className="text-center mb-8 pt-4">
                            <h3 className="text-xl font-medium text-white mb-2 flex items-center justify-center gap-2">
                                Gói Studio / Agency <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            </h3>
                            <div className="text-4xl font-bold text-white mb-1">3.000.000<span className="text-base font-normal text-gray-500 ml-1">đ</span></div>
                            <p className="text-sm text-gray-500 mt-2">Giải pháp tối ưu chi phí nhất cho chuỗi shop.</p>
                        </div>
                        <ul className="space-y-4 mb-8 text-sm flex-grow">
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                                <span>Tổng nhận: <strong className="text-yellow-400 text-lg">6.000.000đ</strong></span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                                <span>Mua 1 được 2 (Siêu hời)</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                                <span>Hỗ trợ Hoàn Xu Khi Ảnh Lỗi</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-300">
                                <Check className="w-4 h-4 text-yellow-500 shrink-0" />
                                <span>Ưu Tiên sử dụng các Model AI mới nhất</span>
                            </li>
                        </ul>
                        <Button
                            variant="liquid"
                            className="w-full mt-auto font-bold text-yellow-200 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 shadow-[inset_0_1px_0_0_rgba(234,179,8,0.4),0_10px_20px_-10px_rgba(234,179,8,0.3)]"
                            onClick={() => handleTopUpClick(3000000)}
                        >
                            Nạp 3 Triệu
                        </Button>
                    </div>
                </div>

                {/* Custom Input Section */}
                <div className="max-w-xl mx-auto">
                    <div className="glass-panel p-6 md:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full">
                            <label className="block text-sm text-gray-400 mb-2 font-medium">Nhập số tiền muốn nạp</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={customInput}
                                    onChange={handleInputChange}
                                    placeholder="Tối thiểu 50.000"
                                    className="w-full bg-neutral-900/50 border border-white/20 rounded-xl px-4 py-3 pl-4 pr-12 text-white font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-gray-600"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">đ</span>
                            </div>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="block text-sm text-transparent mb-2 hidden md:block select-none">Action</label>
                            <Button
                                variant="primary"
                                className="w-full md:w-auto px-8 py-3.5"
                                onClick={() => {
                                    const amount = parseInt(customInput.replace(/\./g, ''));
                                    if (amount >= 50000) {
                                        handleTopUpClick(amount);
                                    } else {
                                        alert('Vui lòng nhập tối thiểu 50.000đ');
                                    }
                                }}
                            >
                                Nạp ngay
                            </Button>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-3">*Hệ thống tự động tính toán Bonus dựa trên số tiền nạp.</p>
                </div>
            </div>

            {/* QR Code Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-[#111] border border-white/10 rounded-3xl max-w-sm w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-white mb-1">Thanh toán qua QR</h3>
                            <p className="text-sm text-gray-400">Sử dụng App ngân hàng để quét mã</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl mb-6 shadow-inner mx-auto w-fit">
                            {/* Placeholder for VietQR API */}
                            <img
                                src={`https://img.vietqr.io/image/${bankConfig.BANK_ID}-${bankConfig.ACCOUNT_NO}-${bankConfig.TEMPLATE}.png?amount=${selectedAmount}&addInfo=WINDI ${userProfile?.payment_code}&accountName=${encodeURIComponent(bankConfig.ACCOUNT_NAME)}`}
                                alt="VietQR Payment"
                                className="w-48 h-48 md:w-56 md:h-56 object-contain"
                            />
                        </div>

                        <div className="space-y-3 bg-white/5 rounded-xl p-4 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-gray-400">Số tiền:</span>
                                <span className="font-bold text-white text-lg">{selectedAmount.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Ngân hàng:</span>
                                <span className="text-white font-medium">{bankConfig.BANK_ID}</span>
                            </div>
                            <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(bankConfig.ACCOUNT_NO)}>
                                <span className="text-gray-400">Số tài khoản:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-white font-medium">{bankConfig.ACCOUNT_NO}</span>
                                    <Copy size={12} className="text-gray-500 group-hover:text-white" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(`WINDI ${userProfile?.payment_code}`)}>
                                <span className="text-gray-400">Nội dung:</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-yellow-400 font-medium">WINDI {userProfile?.payment_code}</span>
                                    <Copy size={12} className="text-gray-500 group-hover:text-yellow-400" />
                                </div>

                            </div>
                        </div>

                        <p className="text-[10px] text-gray-500 text-center mt-4">
                            Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự động cộng Credit.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
};
export default Pricing;