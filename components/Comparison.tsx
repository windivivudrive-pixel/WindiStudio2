import React from 'react';
import { Check, X } from 'lucide-react';
import Button from './ui/Button';

const Comparison: React.FC = () => {
   return (
      <section id="comparison" className="py-24 bg-neutral-900/30 border-y border-white/5 relative">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

               {/* Left Column: Why Choose Us */}
               <div>
                  <h2 className="text-3xl md:text-5xl font-display font-semibold mb-6 leading-tight">
                     Tại sao chọn <br />
                     <span className="text-purple-400">WinDiStudio?</span>
                  </h2>
                  <p className="text-gray-400 mb-8 text-lg">
                     Giải pháp tối ưu chi phí và thời gian cho các thương hiệu thời trang local brand và shop online.
                  </p>

                  <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:bg-white/5 transition-colors duration-500">
                     <div className="absolute top-0 right-0 p-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-all duration-500"></div>
                     <div className="relative z-10 space-y-6">
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                              <Check className="w-5 h-5 text-green-400" />
                           </div>
                           <div>
                              <h4 className="text-white font-medium text-lg">Chi phí cực thấp</h4>
                              <p className="text-sm text-gray-400 mt-1">Chỉ từ 3.000đ cho một bức ảnh chất lượng. Rẻ hơn 50 lần so với thuê mẫu.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                              <Check className="w-5 h-5 text-green-400" />
                           </div>
                           <div>
                              <h4 className="text-white font-medium text-lg">Tốc độ siêu nhanh</h4>
                              <p className="text-sm text-gray-400 mt-1">Không cần chờ lịch chụp, make-up hay chỉnh sửa hậu kỳ. Có thể ảnh ngay lập tức.</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                              <Check className="w-5 h-5 text-green-400" />
                           </div>
                           <div>
                              <h4 className="text-white font-medium text-lg">Đa dạng concept</h4>
                              <p className="text-sm text-gray-400 mt-1">Thử nghiệm hàng trăm phong cách, bối cảnh khác nhau mà không tốn phí setup.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Column: Comparison Table */}
               <div className="relative group self-end">
                  {/* Glow Effect Background */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-50 blur-xl transition-opacity duration-700"></div>

                  <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-2xl">
                     <div className="grid grid-cols-2 text-center border-b border-white/10">
                        <div className="p-5 bg-white/5 text-gray-400 font-medium flex items-center justify-center">Truyền thống</div>
                        <div className="p-5 bg-purple-900/20 text-white font-bold relative overflow-hidden flex items-center justify-center">
                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500"></div>
                           <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent"></div>
                           <span className="relative z-10 text-purple-200">WinDiStudio</span>
                        </div>
                     </div>

                     <div className="divide-y divide-white/5 text-sm">
                        <div className="grid grid-cols-2 py-5 px-6 hover:bg-white/5 transition-colors">
                           <div className="text-gray-400 flex items-center gap-3"><X className="w-4 h-4 text-red-500/50 shrink-0" /> 2-5 triệu/buổi</div>
                           <div className="text-white font-medium flex items-center gap-3 justify-end"><Check className="w-4 h-4 text-green-400 shrink-0" /> 50K/1 bộ</div>
                        </div>
                        <div className="grid grid-cols-2 py-5 px-6 hover:bg-white/5 transition-colors">
                           <div className="text-gray-400 flex items-center gap-3"><X className="w-4 h-4 text-red-500/50 shrink-0" /> 3-5 ngày trả ảnh</div>
                           <div className="text-white font-medium flex items-center gap-3 justify-end"><Check className="w-4 h-4 text-green-400 shrink-0" /> 20 giây/ảnh</div>
                        </div>
                        <div className="grid grid-cols-2 py-5 px-6 hover:bg-white/5 transition-colors">
                           <div className="text-gray-400 flex items-center gap-3"><X className="w-4 h-4 text-red-500/50 shrink-0" /> Setup phức tạp</div>
                           <div className="text-white font-medium flex items-center gap-3 justify-end"><Check className="w-4 h-4 text-green-400 shrink-0" /> Upload là xong</div>
                        </div>
                        <div className="grid grid-cols-2 py-5 px-6 hover:bg-white/5 transition-colors">
                           <div className="text-gray-400 flex items-center gap-3"><X className="w-4 h-4 text-red-500/50 shrink-0" /> Khó đổi concept</div>
                           <div className="text-white font-medium flex items-center gap-3 justify-end"><Check className="w-4 h-4 text-green-400 shrink-0" /> 1 click đổi cảnh</div>
                        </div>
                        <div className="grid grid-cols-2 py-5 px-6 hover:bg-white/5 transition-colors">
                           <div className="text-gray-400 flex items-center gap-3"><X className="w-4 h-4 text-red-500/50 shrink-0" /> Bị phụ thuộc thời tiết, cảm xúc,...</div>
                           <div className="text-white font-medium flex items-center gap-3 justify-end"><Check className="w-4 h-4 text-green-400 shrink-0" /> 24/7 phục vụ theo yêu cầu </div>
                        </div>
                     </div>

                     <div className="p-6 bg-gradient-to-b from-white/5 to-transparent">
                        <p className="text-center text-gray-400 text-xs mb-4">Bạn đã sẵn sàng để nâng cấp hình ảnh thương hiệu?</p>
                        <button
                           className="w-full inline-flex items-center justify-center h-11 px-6 rounded-full font-bold text-white bg-purple-800/60 border border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_40px_rgba(168,85,247,0.8)] active:scale-95 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.4),0_10px_20px_-10px_rgba(168,85,247,0.3)]"
                        >
                           Dùng thử miễn phí ngay
                        </button>
                     </div>
                  </div>
               </div>

            </div>
         </div>
      </section>
   );
};

export default Comparison;