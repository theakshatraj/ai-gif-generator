import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="bg-white shadow-md py-4 px-6 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <img src="/vite.svg" alt="Logo" className="h-8 w-8" />
      <span className="font-bold text-xl text-gray-800">AI GIF Generator</span>
    </div>
    <nav className="space-x-6">
      <Link to="/" className="text-gray-700 hover:text-blue-600 font-medium">Home</Link>
      <Link to="/how-it-works" className="text-gray-700 hover:text-blue-600 font-medium">How It Works</Link>
      <Link to="/about" className="text-gray-700 hover:text-blue-600 font-medium">About</Link>
    </nav>
  </header>
);

export default Header; 