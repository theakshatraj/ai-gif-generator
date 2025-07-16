import React from 'react';

const navLinks = [
  { name: 'Home', href: '#' },
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'Docs', href: '#docs' },
];

const Header = () => (
  <header className="sticky top-0 z-30 w-full backdrop-blur bg-white/80 shadow-sm">
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2 select-none">
        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500">
          {/* Lightning bolt SVG */}
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        <span className="text-2xl font-extrabold bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent tracking-tight">
          GifCraft AI
        </span>
      </div>
      {/* Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="text-gray-700 font-medium hover:text-indigo-600 transition-colors duration-150"
          >
            {link.name}
          </a>
        ))}
      </nav>
      {/* CTA Button */}
      <a
        href="#generator"
        className="ml-4 px-5 py-2 rounded-full font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        Start Creating
      </a>
      {/* Mobile menu placeholder (optional for future) */}
    </div>
  </header>
);

export default Header; 