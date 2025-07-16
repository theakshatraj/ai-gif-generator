import React from 'react';

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

const FeaturesSection = () => (
  <section className="w-full bg-white py-20 border-b border-gray-100">
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent">Powerful Features</h2>
      <p className="text-lg text-gray-600 text-center mb-12">Everything you need to create engaging GIFs from any video content</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all duration-200">
            <div className="mb-4">{f.icon}</div>
            <div className="font-bold text-xl text-gray-900 mb-2 text-center">{f.title}</div>
            <div className="text-gray-500 text-base text-center">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection; 