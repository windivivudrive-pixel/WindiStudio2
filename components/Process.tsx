import React from 'react';
import { Upload, User, Sparkles, ArrowRight } from 'lucide-react';

const Process: React.FC = () => {
  const steps = [
    {
      id: 1,
      icon: <Upload className="w-6 h-6 text-white" />,
      title: "Tải lên ảnh trang phục",
      description: "Chụp ảnh sản phẩm trải sàn (flat-lay) hoặc trên manequin. Hệ thống tự động xử lý."
    },
    {
      id: 2,
      icon: <User className="w-6 h-6 text-white" />,
      title: "Tạo mẫu cùng với trang phục của bạn",
      description: "Tạo người mẫu chuyên nghiệp bằng AI, đa dạng sắc tộc, vóc dáng và thay đổi background tùy ý."
    },
    {
      id: 3,
      icon: <Sparkles className="w-6 h-6 text-white" />,
      title: "Nhận ảnh hoàn thiện",
      description: "AI ghép trang phục lên người mẫu tự nhiên, giữ nguyên chi tiết vải và form dáng. Có thể Upscale lên 4K"
    }
  ];

  return (
    <section id="process" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Quy trình <span className="text-gradient">đơn giản</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Biến ảnh chụp điện thoại thành ảnh Look Book chuyên nghiệp chỉ trong 3 bước.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-t border-dashed border-white/20 z-0"></div>

          {steps.map((step, index) => (
            <div key={step.id} className="relative z-10 group">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl glass-panel flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                   <div className="relative z-10 bg-neutral-900 p-4 rounded-xl border border-white/10 shadow-xl">
                      {step.icon}
                   </div>
                   
                   {/* Step Number Badge */}
                   <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neutral-950 border border-white/20 flex items-center justify-center text-xs font-bold text-gray-500">
                     {step.id}
                   </div>
                </div>

                <h3 className="text-xl font-medium text-white mb-3 group-hover:text-purple-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
              
              {/* Mobile Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-8 text-white/20">
                  <ArrowRight className="w-6 h-6 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Process;