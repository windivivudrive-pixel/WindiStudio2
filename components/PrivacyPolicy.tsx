import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Globe, CreditCard, Server, UserCheck, Scale } from 'lucide-react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
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
                        <Shield className="text-mystic-accent" />
                        Chính Sách Bảo Mật
                    </h1>
                </div>

                <div className="glass-panel p-8 rounded-[24px] space-y-8 text-sm leading-relaxed">
                    <div className="text-center border-b border-white/10 pb-6">
                        <h2 className="text-2xl font-bold text-white mb-2">Chính Sách Bảo Mật của Windi Studio</h2>
                        <p className="text-gray-400">Ngày hiệu lực: 27 tháng 11 năm 2025</p>
                    </div>

                    <p>
                        Chào mừng bạn đến với WinDiStudio. Chúng tôi cam kết bảo vệ thông tin cá nhân và quyền riêng tư của bạn. Chính sách bảo mật này giải thích cách chúng tôi thu thập, sử dụng, chia sẻ và bảo vệ thông tin cá nhân của bạn khi bạn sử dụng trang web và dịch vụ của chúng tôi tại <a href="https://windistudio.app" className="text-indigo-400 hover:underline">https://windistudio.app</a> ("Dịch vụ").
                    </p>
                    <p>
                        Bằng việc truy cập hoặc sử dụng Dịch vụ, bạn đồng ý với các điều khoản của Chính sách bảo mật này. Nếu bạn không đồng ý, vui lòng không sử dụng Dịch vụ.
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Lock size={20} className="text-indigo-400" />
                            1. Thông Tin Chúng Tôi Thu Thập
                        </h2>
                        <p>Chúng tôi thu thập các loại thông tin sau đây để cung cấp và cải thiện Dịch vụ của mình:</p>

                        <div className="pl-4 space-y-3 border-l-2 border-white/10 ml-2">
                            <h3 className="font-bold text-white">1.1. Thông tin bạn cung cấp trực tiếp cho chúng tôi</h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-400">
                                <li><strong>Thông tin tài khoản:</strong> Địa chỉ email, tên hiển thị, ảnh đại diện (thường được thu thập thông qua việc bạn đăng nhập bằng tài khoản Google).</li>
                                <li><strong>Nội dung người dùng:</strong> Các hình ảnh bạn tải lên, các yêu cầu (prompts) bạn nhập vào để tạo ảnh, và các hình ảnh được tạo ra từ Dịch vụ.</li>
                                <li><strong>Thông tin liên hệ:</strong> Email hoặc các thông tin khác bạn cung cấp khi gửi yêu cầu hỗ trợ hoặc phản hồi.</li>
                            </ul>

                            <h3 className="font-bold text-white mt-4">1.2. Thông tin được thu thập tự động</h3>
                            <ul className="list-disc pl-5 space-y-1 text-gray-400">
                                <li><strong>Thông tin thiết bị và trình duyệt:</strong> Loại thiết bị, hệ điều hành, loại trình duyệt, độ phân giải màn hình, ngôn ngữ ưu tiên.</li>
                                <li><strong>Dữ liệu nhật ký (Log Data):</strong> Địa chỉ IP, thời gian truy cập, các trang bạn đã xem, các liên kết bạn đã nhấp vào và các hành động khác bạn thực hiện trên Dịch vụ.</li>
                                <li><strong>Cookies và công nghệ tương tự:</strong> Chúng tôi sử dụng cookies và các công nghệ theo dõi tương tự để ghi nhớ tùy chọn của bạn, duy trì trạng thái đăng nhập và phân tích cách người dùng tương tác với Dịch vụ. Bạn có thể kiểm soát việc sử dụng cookies qua cài đặt trình duyệt của mình.</li>
                            </ul>


                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Eye size={20} className="text-indigo-400" />
                            2. Cách Chúng Tôi Sử Dụng Thông Tin
                        </h2>
                        <ul className="list-disc pl-5 space-y-2 text-gray-400">
                            <li><strong>Cung cấp và duy trì Dịch vụ:</strong> Cho phép bạn đăng nhập, tạo ảnh, quản lý tài khoản và sử dụng các tính năng của Windi Studio.</li>
                            <li><strong>Xử lý giao dịch:</strong> Thực hiện các yêu cầu nạp tiền và quản lý số dư tín dụng của bạn.</li>
                            <li><strong>Cải thiện Dịch vụ:</strong> Phân tích xu hướng sử dụng, sửa lỗi, phát triển tính năng mới và nâng cao trải nghiệm người dùng.</li>
                            <li><strong>Liên lạc:</strong> Gửi cho bạn các thông báo kỹ thuật, cập nhật bảo mật, xác nhận giao dịch, hoặc phản hồi các yêu cầu hỗ trợ của bạn.</li>
                            <li><strong>Đảm bảo an toàn:</strong> Phát hiện và ngăn chặn các hành vi gian lận, lạm dụng hoặc các hoạt động vi phạm điều khoản sử dụng của chúng tôi.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Globe size={20} className="text-indigo-400" />
                            3. Chia Sẻ Thông Tin
                        </h2>
                        <p>Chúng tôi không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin của bạn trong các trường hợp hạn chế sau:</p>
                        <ul className="list-disc pl-5 space-y-2 text-gray-400">
                            <li>
                                <strong>Nhà cung cấp dịch vụ:</strong> Chúng tôi chia sẻ thông tin với các bên thứ ba tin cậy giúp chúng tôi vận hành Dịch vụ, chẳng hạn như:
                                <ul className="list-circle pl-5 mt-1 space-y-1 text-gray-500">
                                    <li>Cloudflare: Để lưu trữ cơ sở dữ liệu và xác thực người dùng.</li>
                                    <li>Google (Google Cloud/OAuth): Để cung cấp tính năng đăng nhập và các dịch vụ AI (nếu có).</li>
                                    <li>Nhà cung cấp dịch vụ thanh toán VietQR để xử lý các giao dịch thanh toán.</li>
                                </ul>
                            </li>
                            <li><strong>Yêu cầu pháp lý:</strong> Chúng tôi có thể tiết lộ thông tin của bạn nếu tin rằng điều đó là cần thiết để tuân thủ luật pháp, quy định, quy trình pháp lý hoặc yêu cầu hợp lệ từ cơ quan chính phủ.</li>
                            <li><strong>Bảo vệ quyền lợi:</strong> Để bảo vệ quyền, tài sản hoặc sự an toàn của Windi Studio, người dùng của chúng tôi hoặc công chúng, theo quy định của pháp luật.</li>
                            <li><strong>Chuyển giao kinh doanh:</strong> Nếu WinDiStudio tham gia vào việc sáp nhập, mua lại hoặc bán tài sản, thông tin của bạn có thể được chuyển giao như một phần của giao dịch đó.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Server size={20} className="text-indigo-400" />
                            4. Bảo Mật Dữ Liệu
                        </h2>
                        <p>
                            Chúng tôi thực hiện các biện pháp bảo mật kỹ thuật và tổ chức hợp lý để bảo vệ thông tin cá nhân của bạn khỏi bị truy cập trái phép, sử dụng sai mục đích, thay đổi hoặc phá hủy. Tuy nhiên, xin lưu ý rằng không có phương thức truyền tải qua Internet hoặc phương thức lưu trữ điện tử nào là an toàn 100%. Mặc dù chúng tôi cố gắng hết sức để bảo vệ thông tin của bạn, chúng tôi không thể đảm bảo an ninh tuyệt đối.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <UserCheck size={20} className="text-indigo-400" />
                            5. Quyền Của Bạn
                        </h2>
                        <p>Tùy thuộc vào luật pháp hiện hành tại khu vực của bạn, bạn có thể có một số quyền liên quan đến thông tin cá nhân của mình, bao gồm:</p>
                        <ul className="list-disc pl-5 space-y-1 text-gray-400">
                            <li>Quyền truy cập vào thông tin cá nhân chúng tôi đang nắm giữ về bạn.</li>
                            <li>Quyền yêu cầu sửa đổi hoặc cập nhật thông tin không chính xác.</li>
                            <li>Quyền yêu cầu xóa thông tin cá nhân của bạn (trong một số trường hợp nhất định).</li>
                            <li>Quyền phản đối hoặc hạn chế việc chúng tôi xử lý thông tin của bạn.</li>
                        </ul>
                        <p className="text-sm text-gray-500 mt-2">Để thực hiện các quyền này, vui lòng liên hệ với chúng tôi theo thông tin bên dưới.</p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Scale size={20} className="text-green-400" />
                            6. Quyền Sở Hữu & Thương Mại
                        </h2>
                        <div className="pl-4 space-y-4 border-l-2 border-green-500/30 ml-2">
                            <div>
                                <h3 className="font-bold text-white">Quyền sử dụng</h3>
                                <p className="text-gray-400">
                                    Windi Studio cấp cho Người dùng quyền <strong className="text-white">vĩnh viễn, không độc quyền, miễn phí bản quyền (royalty-free)</strong> để sử dụng, sao chép, chỉnh sửa và công khai các Hình ảnh được tạo ra từ Dịch vụ cho bất kỳ mục đích thương mại nào (bao gồm nhưng không giới hạn ở: quảng cáo, bao bì sản phẩm, website bán hàng, sàn thương mại điện tử).
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Sản phẩm đầu vào</h3>
                                <p className="text-gray-400">
                                    Bạn giữ toàn bộ quyền sở hữu trí tuệ đối với hình ảnh sản phẩm gốc (ảnh quần áo/phụ kiện) mà bạn tải lên hệ thống.
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Quyền hình ảnh người mẫu</h3>
                                <p className="text-gray-400">
                                    Các người mẫu xuất hiện trong ảnh là sản phẩm của trí tuệ nhân tạo (AI), không phải người thật. Do đó, bạn được <strong className="text-white">miễn trừ hoàn toàn</strong> các rủi ro pháp lý liên quan đến quyền nhân thân, quyền hình ảnh hoặc tranh chấp hợp đồng người mẫu. Bạn có thể yên tâm sử dụng hình ảnh vô thời hạn.
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-green-200 text-xs mt-2">
                            <strong>✓ Tóm tắt:</strong> Bạn sở hữu hoàn toàn ảnh sản phẩm gốc. Ảnh AI được tạo ra có thể sử dụng thương mại không giới hạn mà không lo vấn đề bản quyền người mẫu.
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white">7. Quyền Riêng Tư Của Trẻ Em</h2>
                        <p>
                            Dịch vụ của chúng tôi không dành cho người dưới 13 tuổi (hoặc độ tuổi tối thiểu khác theo quy định pháp luật địa phương). Chúng tôi không cố ý thu thập thông tin cá nhân từ trẻ em. Nếu bạn tin rằng chúng tôi đã vô tình thu thập thông tin từ trẻ em, vui lòng liên hệ với chúng tôi ngay lập tức để chúng tôi có thể xóa thông tin đó.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white">8. Liên Kết Đến Các Trang Web Khác</h2>
                        <p>
                            Dịch vụ của chúng tôi có thể chứa các liên kết đến các trang web hoặc dịch vụ của bên thứ ba không thuộc quyền kiểm soát của chúng tôi. Chính sách bảo mật này không áp dụng cho các trang web hoặc dịch vụ đó. Chúng tôi khuyến khích bạn xem xét chính sách bảo mật của bất kỳ trang web bên thứ ba nào mà bạn truy cập.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white">9. Thay Đổi Chính Sách Bảo Mật</h2>
                        <p>
                            Chúng tôi có thể cập nhật Chính sách bảo mật này theo thời gian để phản ánh các thay đổi trong hoạt động của chúng tôi hoặc các yêu cầu pháp lý. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng nào bằng cách đăng chính sách mới trên trang này và cập nhật "Ngày hiệu lực" ở trên cùng. Bạn nên xem lại Chính sách bảo mật này định kỳ để nắm được thông tin mới nhất. Việc bạn tiếp tục sử dụng Dịch vụ sau khi các thay đổi có hiệu lực sẽ cấu thành sự đồng ý của bạn đối với các thay đổi đó.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileText size={20} className="text-indigo-400" />
                            10. Liên Hệ Với Chúng Tôi
                        </h2>
                        <p>
                            Nếu bạn có bất kỳ câu hỏi hoặc thắc mắc nào về Chính sách bảo mật này hoặc cách chúng tôi xử lý thông tin của bạn, vui lòng liên hệ với chúng tôi qua email tại:
                        </p>
                        <a href="mailto:windivivu@gmail.com" className="block mt-2 text-indigo-400 font-bold hover:underline text-lg">
                            windivivu@gmail.com
                        </a>
                    </section>

                    <div className="pt-8 border-t border-white/10 text-xs text-gray-500 text-center">
                        Copyright ©2025 Windi Studio. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};
