import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => (
  <section className="text-center py-16 bg-gradient-to-b from-blue-50 to-white">
    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">Turn Videos into Captioned GIFs with AI</h1>
    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
      Upload a video or paste a YouTube link, enter a theme, and get smart, captioned GIFs in seconds.
    </p>
    <Link to="/generate">
      <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition">Get Started</button>
    </Link>
  </section>
);

export default HeroSection; 