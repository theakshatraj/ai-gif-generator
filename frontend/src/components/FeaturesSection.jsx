import React, { useEffect, useRef } from 'react';

const features = [
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
    title: 'AI-Powered Analysis',
    desc: 'Our AI analyzes your video content and prompt to find the perfect moments for GIF creation.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
    ),
    title: 'Instant Processing',
    desc: 'Generate multiple GIFs in seconds with our optimized AI pipeline and cloud processing.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>
    ),
    title: 'Smart Captions',
    desc: 'Automatically generated captions with perfect timing, styling, and positioning.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
    ),
    title: 'Multiple Formats',
    desc: 'Export GIFs in various sizes and formats for all your social platforms.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
    ),
    title: 'Easy Sharing',
    desc: 'Share your GIFs instantly with a link or download to your device.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    ),
    title: 'Batch Processing',
    desc: 'Create and download multiple GIFs at once for maximum productivity.'
  },
];

const FeaturesSection = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const animatedElements = sectionRef.current?.querySelectorAll('.animate-on-scroll');
    animatedElements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="w-full bg-white py-20 border-b border-gray-100 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-100 rounded-full opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-blue-100 rounded-full opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-indigo-100 rounded-full opacity-30 animate-float" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-1000">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600 animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-200">
            Everything you need to create engaging GIFs from any video content
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div 
              key={i} 
              className="group bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 relative overflow-hidden"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Hover background effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Icon container with animation */}
              <div className="relative z-10 mb-6 p-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 group-hover:from-purple-200 group-hover:to-blue-200 transition-all duration-500 transform group-hover:scale-110 group-hover:rotate-6">
                <div className="transform group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
              </div>
              
              {/* Content */}
              <div className="relative z-10 text-center">
                <div className="font-bold text-xl text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors duration-300">
                  {f.title}
                </div>
                <div className="text-gray-500 text-base leading-relaxed">
                  {f.desc}
                </div>
              </div>
              
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 