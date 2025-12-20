import React from 'react';
import { Upload, User, Sparkles, ArrowRight } from 'lucide-react';

// Sample images for each step
const stepImages = {
  step1: [
    "https://img.windistudio.app/Screenshot%202025-12-09%20at%2010.20.33%20AM.png"
  ],
  step2: [
    "https://img.windistudio.app/1765212527381_0.png",
    "https://img.windistudio.app/1765212705047_0.png"
  ],
  step3: [
    "https://img.windistudio.app/Screenshot%202025-12-09%20at%209.225.59%20AM.jpg",

    "https://img.windistudio.app/Screenshot%202025-12-09%20at%2012.47.46%20AM.png",
    "https://img.windistudio.app/Screenshot%202025-12-09%20at%209.25.59%20AM.jpg"
  ]
};

const Process: React.FC = () => {
  const steps = [
    {
      id: 1,
      icon: <Upload className="w-6 h-6 text-white" />,
      title: "Tải lên ảnh trang phục",
      description: "Chụp ảnh sản phẩm trải sàn (flat-lay) hoặc trên manequin. Có thể Mix&Match với nhiều sản phẩm khác nhau.",
      images: stepImages.step1
    },
    {
      id: 2,
      icon: <User className="w-6 h-6 text-white" />,
      title: "Tạo mẫu cùng outfit của bạn",
      description: "Người mẫu chuyên nghiệp bằng AI, đa dạng sắc tộc và có thể thay đổi background phù hợp với outfit của bạn.",
      images: stepImages.step2
    },
    {
      id: 3,
      icon: <Sparkles className="w-6 h-6 text-white" />,
      title: "Nhận ảnh hoàn thiện",
      description: "Tạo dáng tự nhiên, giữ nguyên chi tiết vải và form dáng. Có thể Upscale lên 4K",
      images: stepImages.step3
    }
  ];

  return (
    <section id="process" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Chế độ Studio <span className="text-gradient">dành cho chủ shop</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Tối ưu hóa để tạo ảnh Look Book chuyên nghiệp chỉ trong 3 bước.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent border-t border-dashed border-white/20 z-0"></div>

          {steps.map((step, index) => (
            <div key={step.id} className="relative z-10 group">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl glass-panel flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 bg-neutral-900 p-4 rounded-xl border border-white/10 shadow-xl">
                    {step.icon}
                  </div>

                  {/* Step Number Badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-neutral-950 border border-white/20 flex items-center justify-center text-xs font-bold text-gray-500">
                    {step.id}
                  </div>
                </div>

                {/* Image Cards Section */}
                <div
                  className="flex justify-center items-end mb-8 h-56 relative"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5))'
                  }}
                >
                  {step.images.map((img, idx) => {
                    // Special sizing for step 3 - only last image is bigger
                    const isStep3 = step.id === 3;
                    const isLastInStep3 = isStep3 && idx === step.images.length - 1;

                    const cardWidth = isLastInStep3 ? 'w-48' : 'w-40';
                    const cardHeight = isLastInStep3 ? 'h-60' : 'h-52';
                    const marginLeft = idx > 0 ? '-24px' : '0';

                    return (
                      <div
                        key={idx}
                        className={`relative ${cardWidth} ${cardHeight} rounded-2xl group-hover:scale-105 transition-all duration-300 overflow-hidden border border-white/40`}
                        style={{
                          transform: step.images.length > 1
                            ? `rotate(${(idx - (step.images.length - 1) / 2) * (isStep3 ? 4 : 6)}deg)`
                            : 'rotate(0deg)',
                          zIndex: idx + 1,
                          marginLeft
                        }}
                      >
                        <img
                          src={img}
                          alt={`Step ${step.id} image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* 4K Badge for last image in step 3 */}
                        {isLastInStep3 && (
                          <div className="absolute top-2 right-2 bg-white px-2.5 py-1 rounded-md shadow-lg flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600 tracking-wide leading-none">4K</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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