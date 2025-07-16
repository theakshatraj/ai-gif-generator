import React from 'react';

const features = [
  {
    icon: (
      <svg className="h-6 w-6 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
    title: 'AI-Powered',
    desc: 'Smartly detects the best moments.'
  },
  {
    icon: (
      <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
    ),
    title: 'No Downloads',
    desc: 'Works right in your browser.'
  },
  {
    icon: (
      <svg className="h-6 w-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
    ),
    title: 'Fast Results',
    desc: 'GIFs in seconds, not minutes.'
  },
];

const HeroSection = () => (
  <section className="w-full bg-gradient-to-b from-gray-50 to-gray-100 py-12 md:py-20 border-b border-gray-200">
    <div className="max-w-3xl mx-auto text-center px-4">
      <span className="inline-block mb-4 px-4 py-1 rounded-full bg-gradient-to-tr from-indigo-100 to-blue-100 text-indigo-600 font-semibold text-sm shadow-sm">
        Join 10,000+ creators
      </span>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent leading-tight">
        AI-Powered Video to GIF Generator
      </h1>
      <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium">
        Instantly turn YouTube clips or your own videos into stunning, captioned GIFs with the power of AI.
      </p>
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-8">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl shadow-md px-5 py-3 min-w-[200px]">
            <span>{f.icon}</span>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-base">{f.title}</div>
              <div className="text-gray-500 text-sm">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HeroSection; 