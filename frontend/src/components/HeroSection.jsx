import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HeroSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sectionRef = useRef(null);

  const handleStartCreating = (e) => {
    if (!user) {
      e.preventDefault();
      navigate('/signup');
    }
  };

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
    <section ref={sectionRef} className="w-full bg-gradient-to-b from-[#faf7ff] to-[#f5f8ff] pt-16 pb-20 border-b border-gray-100 overflow-hidden">
      <div className="max-w-3xl mx-auto text-center px-4">
        {/* Gradient Badge */}
        <span className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm shadow-sm animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700">
          <svg className="h-5 w-5 text-purple-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
          AI-Powered GIF Generation
        </span>
        
        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent leading-tight animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-1000 animate-in:delay-200">
          Turn Videos into <br className="hidden md:block" /> Viral GIFs
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-400">
          Upload any video or YouTube link, describe what you want, and let our AI create perfect captioned GIFs automatically. No editing skills required.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-on-scroll opacity-0 translate-y-6 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-600">
          <Link
            to="/generate"
            onClick={handleStartCreating}
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-lg transform hover:scale-105 hover:shadow-lg"
          >
            <svg className="h-5 w-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
            Start Creating Free
          </Link>
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-indigo-600 bg-white border border-indigo-100 shadow hover:bg-indigo-50 transition-all duration-300 text-lg transform hover:scale-105 hover:shadow-lg"
          >
            <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Watch Demo
          </a>
        </div>
        
        {/* Example Card Area */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mt-2 animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-1000 animate-in:delay-800">
          {/* Prompt Example Card */}
          <div className="group bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs text-left border border-gray-100 transform transition-all duration-500 hover:scale-105 hover:shadow-xl hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <div className="text-gray-700 text-base mb-1">Prompt:</div>
            <div className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">"funny moments"</div>
            <div className="mt-4 text-xs text-blue-600 font-semibold">YouTube URL:</div>
            <div className="text-xs text-gray-700">youtube.com/watch?v=...</div>
          </div>
          
          {/* Arrow Animation */}
          <div className="hidden md:flex items-center justify-center w-16 h-16 animate-bounce">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          
          {/* Output Example Card */}
          <div className="group bg-gradient-to-tr from-purple-50 to-blue-50 rounded-2xl shadow-lg p-6 w-full max-w-xs flex flex-col items-center justify-center border border-gray-100 transform transition-all duration-500 hover:scale-105 hover:shadow-xl hover:-translate-y-2 relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <svg className="h-10 w-10 text-purple-400 mb-2 transition-transform group-hover:scale-110 group-hover:rotate-12 duration-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div className="font-bold text-lg text-gray-900 text-center group-hover:text-purple-600 transition-colors duration-300">Generated GIF</div>
            <div className="text-xs text-gray-500 text-center">with AI captions</div>
          </div>
        </div>
      </div>
      
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-2 h-2 bg-purple-300 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse opacity-50" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-30" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
      </div>
    </section>
  );
};

export default HeroSection; 