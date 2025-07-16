import React from 'react';

const steps = [
  {
    icon: (
      <svg className="h-10 w-10 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
    ),
    title: 'Upload Video',
    desc: 'Upload your MP4 file or paste a YouTube URL. We support videos up to 10 minutes long.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 12h8M8 16h4" /></svg>
    ),
    title: 'Describe Your Vision',
    desc: 'Tell our AI what kind of GIFs you want: funny moments, quotes, reactions, or any theme.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
    title: 'AI Magic Happens',
    desc: 'Our AI analyzes the content, finds key moments, and generates perfectly captioned GIFs.'
  },
  {
    icon: (
      <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 17v-6m0 0V7m0 4l-4 4m4-4l4 4" /></svg>
    ),
    title: 'Download & Share',
    desc: 'Get your GIFs instantly, customize if needed, and share across all your platforms.'
  },
];

const HowItWorksSection = () => (
  <section className="w-full bg-gradient-to-b from-[#f5f8ff] to-white py-20 border-b border-gray-100">
    <div className="max-w-6xl mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent">How It Works</h2>
      <p className="text-lg text-gray-600 text-center mb-12">From video to viral GIF in just 4 simple steps</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-gray-100 hover:shadow-2xl transition-all duration-200">
            <div className="mb-4">{step.icon}</div>
            <div className="flex items-center justify-center mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white font-bold text-lg shadow">{i + 1}</span>
            </div>
            <div className="font-bold text-lg text-gray-900 mb-2 text-center">{step.title}</div>
            <div className="text-gray-500 text-base text-center">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection; 