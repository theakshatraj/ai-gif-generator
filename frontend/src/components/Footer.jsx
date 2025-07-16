import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-100 py-4 px-6 mt-10 text-center text-gray-500 text-sm">
    <div className="mb-2">
      &copy; {new Date().getFullYear()} AI GIF Generator. All rights reserved.
    </div>
    <div className="space-x-4">
      <Link to="/about" className="hover:underline">About</Link>
      <Link to="/contact" className="hover:underline">Contact</Link>
    </div>
  </footer>
);

export default Footer; 