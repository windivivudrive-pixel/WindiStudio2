import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { supabase } from '../services/supabaseClient';

interface RegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'shop' | 'creator';
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, type }) => {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        brandName: '',
        email: '',
        tiktokUrl: '',
        instagramUrl: '',
        facebookUrl: ''
    });

    if (!isOpen) return null;

    const isShop = type === 'shop';
    const title = isShop ? 'Nhận 500 Xu Miễn Phí' : 'Đăng ký Creator Partner';
    const description = isShop
        ? 'Điền thông tin Shop để hệ thống kích hoạt gói quà tặng Giáng Sinh & Tết.'
        : 'Gửi thông tin kênh của bạn để đội ngũ WinDi liên hệ hợp tác.';

    // Validate at least one social URL is provided
    const hasAtLeastOneSocial = formData.tiktokUrl || formData.instagramUrl || formData.facebookUrl;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!hasAtLeastOneSocial) {
            setError('Vui lòng nhập ít nhất 1 link mạng xã hội');
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: dbError } = await supabase
                .from('campaign_registrations')
                .insert({
                    type: type,
                    brand_name: formData.brandName,
                    email: formData.email,
                    tiktok_url: formData.tiktokUrl || null,
                    instagram_url: formData.instagramUrl || null,
                    facebook_url: formData.facebookUrl || null
                });

            if (dbError) {
                console.error('DB Error:', dbError);
                setError('Có lỗi xảy ra, vui lòng thử lại');
                setIsSubmitting(false);
                return;
            }

            setIsSubmitting(false);
            setStep('success');
        } catch (err) {
            console.error('Submit error:', err);
            setError('Có lỗi xảy ra, vui lòng thử lại');
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep('form');
        setError(null);
        setFormData({ brandName: '', email: '', tiktokUrl: '', instagramUrl: '', facebookUrl: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Decorative Header Gradient */}
                <div className={`h-2 w-full bg-gradient-to-r ${isShop ? 'from-red-500 to-orange-500' : 'from-amber-300 to-amber-600'}`} />

                <div className="p-8">
                    {step === 'form' ? (
                        <>
                            <div className="mb-6">
                                <h3 className="text-2xl font-display font-semibold text-white mb-2">{title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Brand Name */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                                        {isShop ? 'Tên Thương Hiệu / Shop' : 'Tên Kênh / Creator'} *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder={isShop ? "Ví dụ: Chic Boutique" : "Ví dụ: @windi.fashion"}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                        value={formData.brandName}
                                        onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                {/* Social Links Section */}
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Mạng xã hội (ít nhất 1) *
                                    </label>

                                    {/* TikTok */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 w-20">TikTok</span>
                                        <input
                                            type="url"
                                            placeholder="https://tiktok.com/@..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                                            value={formData.tiktokUrl}
                                            onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                                        />
                                    </div>

                                    {/* Instagram */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 w-20">Instagram</span>
                                        <input
                                            type="url"
                                            placeholder="https://instagram.com/..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                                            value={formData.instagramUrl}
                                            onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                                        />
                                    </div>

                                    {/* Facebook */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500 w-20">Facebook</span>
                                        <input
                                            type="url"
                                            placeholder="https://facebook.com/..."
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                                            value={formData.facebookUrl}
                                            onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    className={`w-full mt-4 ${isShop ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:shadow-red-900/20' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:shadow-amber-900/20'}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                                        </span>
                                    ) : (
                                        "Gửi Đăng Ký"
                                    )}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8 animate-in fade-in zoom-in">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Đăng ký thành công!</h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Cảm ơn bạn đã quan tâm. Đội ngũ WinDi sẽ liên hệ với bạn trong vòng 24h làm việc hoặc bạn có thể inbox Instagram để được phản hồi nhanh hơn.
                            </p>
                            <Button variant="secondary" onClick={handleClose} className="w-full">
                                Đóng
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistrationModal;
