import React from 'react';

const HeroSection = () => (
  <section className="w-full bg-gradient-to-b from-[#faf7ff] to-[#f5f8ff] pt-16 pb-20 border-b border-gray-100">
    <div className="max-w-3xl mx-auto text-center px-4">
      {/* Gradient Badge */}
      <span className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm shadow-sm">
        <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
        AI-Powered GIF Generation
      </span>
      {/* Headline */}
      <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent leading-tight">
        Turn Videos into <br className="hidden md:block" /> Viral GIFs
      </h1>
      {/* Subheadline */}
      <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium">
        Upload any video or YouTube link, describe what you want, and let our AI create perfect captioned GIFs automatically. No editing skills required.
      </p>
      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <a
          href="#generator"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
          Start Creating Free
        </a>
        <a
          href="#demo"
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-indigo-600 bg-white border border-indigo-100 shadow hover:bg-indigo-50 transition-all duration-200 text-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Watch Demo
        </a>
      </div>
      {/* Example Card Area */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-2">
        {/* Prompt Example Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs text-left border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
            <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
          </div>
          <div className="text-gray-700 text-base mb-1">Prompt:</div>
          <div className="font-bold text-lg text-gray-900">"funny moments"</div>
          <div className="mt-4 text-xs text-blue-600 font-semibold">YouTube URL:</div>
          <div className="text-xs text-gray-700">youtube.com/watch?v=...</div>
        </div>
        {/* Output Example Card */}
        <div className="bg-gradient-to-tr from-purple-50 to-blue-50 rounded-2xl shadow-lg p-6 w-full max-w-xs flex flex-col items-center justify-center border border-gray-100">
          <svg className="h-10 w-10 text-purple-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="font-bold text-lg text-gray-900 text-center">Generated GIF</div>
          <div className="text-xs text-gray-500 text-center">with AI captions</div>
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection; 