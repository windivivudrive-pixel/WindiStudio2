import React from 'react';
import { ArrowLeft, FileText, CreditCard, Shield, AlertTriangle, Bot, Filter, Copyright, RefreshCw } from 'lucide-react';

interface TermsOfServiceProps {
    onBack: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack }) => {
    return (
        <div className="w-full min-h-screen bg-black text-gray-300 p-6 lg:p-10 flex flex-col items-center overflow-y-auto">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <FileText className="text-mystic-accent" />
                        Điều Khoản Sử Dụng
                    </h1>
                </div>

                <div className="glass-panel p-8 rounded-[24px] space-y-8 text-sm leading-relaxed">
                    <div className="text-center border-b border-white/10 pb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Điều Khoản Sử Dụng - Windi Studio</h2>
                        <p className="text-gray-400">Cập nhật lần cuối: 05/09/2025</p>
                    </div>

                    <p>
                        Chào mừng bạn đến với Windi Studio. Khi truy cập và sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản dưới đây. Vui lòng đọc kỹ trước khi bắt đầu.
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CreditCard size={20} className="text-yellow-400" />
                            1. Chính sách về Tín dụng (Credit/Xu) & Thanh toán
                        </h2>
                        <div className="pl-4 space-y-3 border-l-2 border-yellow-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Bản chất của Xu</h3>
                                <p className="text-gray-400">
                                    "Xu" (Credit) trong Windi Studio là đơn vị có giá trị sử dụng nội bộ để đổi lấy dịch vụ tạo ảnh/xử lý ảnh trên nền tảng của chúng tôi.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Không quy đổi tiền mặt</h3>
                                <p className="text-gray-400">
                                    Xu <strong className="text-red-400">KHÔNG</strong> có giá trị quy đổi ngược lại thành tiền mặt, không thể chuyển nhượng cho tài khoản khác và không được hoàn trả dưới mọi hình thức sau khi đã nạp thành công.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Sử dụng hợp lý</h3>
                                <p className="text-gray-400">
                                    Chúng tôi khuyến khích bạn nạp gói phù hợp với nhu cầu sử dụng.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield size={20} className="text-red-400" />
                            2. Trách nhiệm Pháp lý & Chống Giả mạo
                        </h2>
                        <div className="pl-4 space-y-3 border-l-2 border-red-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Cấm giả mạo (Impersonation)</h3>
                                <p className="text-gray-400">
                                    Windi Studio nghiêm cấm mọi hành vi sử dụng công nghệ AI của chúng tôi để tạo ra hình ảnh giả mạo người khác (Deepfake), bôi nhọ danh dự, hoặc sử dụng hình ảnh của bất kỳ cá nhân nào mà không có sự đồng thuận của họ (đặc biệt là người nổi tiếng, trẻ em, hoặc các nhân vật chính trị).
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Trách nhiệm người dùng</h3>
                                <p className="text-gray-400">
                                    Bạn phải chịu hoàn toàn trách nhiệm trước pháp luật về nội dung (hình ảnh gốc và hình ảnh tạo ra) mà bạn tải lên hoặc tạo ra từ nền tảng. Windi Studio chỉ cung cấp công cụ, chúng tôi miễn trừ mọi trách nhiệm liên quan đến việc người dùng sử dụng sản phẩm đầu ra sai mục đích hoặc vi phạm pháp luật nước sở tại.
                                </p>
                            </div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-red-200 text-xs">
                            <strong>⚠️ Cảnh báo:</strong> Vi phạm điều khoản này có thể dẫn đến việc khóa tài khoản vĩnh viễn và chịu trách nhiệm pháp lý.
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Bot size={20} className="text-purple-400" />
                            3. Giới hạn của Công nghệ AI (Disclaimer)
                        </h2>
                        <div className="pl-4 space-y-3 border-l-2 border-purple-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Bản chất ngẫu nhiên</h3>
                                <p className="text-gray-400">
                                    Trí tuệ nhân tạo (Generative AI) hoạt động dựa trên xác suất và không hoàn hảo tuyệt đối. Do đó, kết quả tạo ra có thể đôi khi gặp lỗi (về chi tiết ngón tay, mắt, hoặc bố cục...). Đây là đặc thù chung của công nghệ hiện tại trên toàn thế giới.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Sự thích nghi</h3>
                                <p className="text-gray-400">
                                    Bằng việc sử dụng dịch vụ, bạn chấp nhận rằng sẽ có tỷ lệ sai số nhất định. Chúng tôi khuyến khích người dùng chủ động điều chỉnh câu lệnh (prompt), thay đổi ảnh đầu vào hoặc sử dụng các công cụ chỉnh sửa bổ sung để đạt kết quả tối ưu nhất. <strong className="text-white">Chúng tôi không cam kết độ chính xác 100% cho mọi lần tạo ảnh.</strong>
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Filter size={20} className="text-orange-400" />
                            4. Chính sách Kiểm duyệt Nội dung (Safety Filter)
                        </h2>
                        <div className="pl-4 space-y-3 border-l-2 border-orange-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Cơ chế "Thà bắt lầm hơn bỏ sót"</h3>
                                <p className="text-gray-400">
                                    Để đảm bảo môi trường an toàn và tuân thủ các tiêu chuẩn cộng đồng quốc tế, hệ thống AI của chúng tôi được trang bị bộ lọc nội dung nghiêm ngặt. Mọi hình ảnh chứa yếu tố nhạy cảm (khỏa thân, bạo lực, kích động...) sẽ bị chặn tự động.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Xử lý khi bị chặn nhầm</h3>
                                <p className="text-gray-400">
                                    Do cơ chế kiểm duyệt tự động, đôi khi AI có thể nhận diện nhầm các hình ảnh thời trang bình thường là nhạy cảm (False Positive). Trong trường hợp này:
                                </p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-400">
                                    <li>Vui lòng thử lại với một góc chụp khác.</li>
                                    <li>Điều chỉnh lại mô tả (prompt) để tránh các từ khóa dễ gây hiểu lầm.</li>
                                    <li><strong className="text-green-400">Hệ thống sẽ không trừ Xu cho các lần tạo bị lỗi hoặc bị chặn bởi bộ lọc.</strong></li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Copyright size={20} className="text-green-400" />
                            5. Quyền Sở hữu Trí tuệ
                        </h2>
                        <div className="pl-4 space-y-3 border-l-2 border-green-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Quyền của bạn</h3>
                                <p className="text-gray-400">
                                    Bạn nắm quyền sở hữu thương mại đối với các hình ảnh do bạn tạo ra từ Windi Studio (sau khi đã thanh toán phí dịch vụ/trừ xu). Bạn được phép sử dụng chúng cho mục đích quảng cáo, bán hàng, in ấn.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Quyền của chúng tôi</h3>
                                <p className="text-gray-400">
                                    Chúng tôi có quyền lưu trữ (nhưng không chia sẻ công khai) các dữ liệu này để phục vụ mục đích cải thiện chất lượng AI và giải quyết các tranh chấp kỹ thuật nếu có.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <RefreshCw size={20} className="text-blue-400" />
                            6. Thay đổi Điều khoản
                        </h2>
                        <p className="text-gray-400">
                            Windi Studio có quyền thay đổi, bổ sung các điều khoản này bất cứ lúc nào để phù hợp với tình hình vận hành thực tế và quy định pháp luật. Những thay đổi sẽ có hiệu lực ngay khi được đăng tải trên website.
                        </p>
                    </section>

                    <div className="pt-8 border-t border-white/10 text-xs text-gray-500 text-center">
                        Copyright ©2025 Windi Studio. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
