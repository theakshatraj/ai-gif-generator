import React from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { name: 'Features', href: '#features' },
  // { name: 'Pricing', href: '#pricing' }, // Pricing removed from homepage and nav
];

const Header = () => (
  <header className="sticky top-0 z-30 w-full backdrop-blur bg-white/80 shadow-sm">
    <div className="max-w-6xl mx-auto flex items-center py-3 px-4 md:px-8">
      {/* Logo */}
      <a href="#" className="flex items-center gap-2 select-none group">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 group-hover:scale-105 transition-transform">
          {/* Lightning bolt SVG */}
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" className="h-6 w-6">
            <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-2xl font-extrabold bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent tracking-tight group-hover:opacity-80 transition-opacity">
          GifCraft AI
        </span>
      </a>
      <div className="flex-1" />
      {/* Nav */}
      <nav className="hidden md:flex items-center gap-6 mr-4">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-gray-700 font-medium hover:text-indigo-600 transition-colors duration-200"
          >
            {link.name}
          </a>
        ))}
      </nav>
      {/* Auth & CTA Buttons */}
      <div className="flex items-center gap-2">
        <a
          href="#signin"
          className="px-4 py-2 rounded-lg font-semibold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base"
        >
          Sign In
        </a>
        <Link
          to="/generate"
          className="px-5 py-2 rounded-full font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-base"
        >
          Start Creating
        </Link>
      </div>
    </div>
  </header>
);

export default Header; 