import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { name: 'Features', href: '#features' },
  // { name: 'Pricing', href: '#pricing' },
];

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if we're on the generate page
  const isOnGeneratePage = location.pathname === '/generate';

  const handleStartCreating = (e) => {
    if (!user) {
      e.preventDefault();
      navigate('/signup');
    }
  };

  const handleLogout = () => {
    logout(navigate);
    setShowLogoutConfirm(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-30 w-full backdrop-blur transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/90 shadow-lg border-b border-gray-100' 
        : 'bg-white/80 shadow-sm'
    }`}>
      <div className="max-w-6xl mx-auto flex items-center py-3 px-4 md:px-8">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 select-none group animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500">
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 group-hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl">
            {/* Lightning bolt SVG */}
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300">
              <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-2xl font-extrabold bg-gradient-to-tr from-indigo-500 to-blue-500 bg-clip-text text-transparent tracking-tight group-hover:opacity-80 transition-opacity duration-300">
            GifCraft AI
          </span>
        </a>
        <div className="flex-1" />
        {/* Nav - Hide completely on generate page */}
        {!isOnGeneratePage && (
          <nav className="hidden md:flex items-center gap-6 mr-4">
            {navLinks.map((link, index) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-700 font-medium hover:text-indigo-600 transition-all duration-300 relative group animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </nav>
        )}
        {/* Auth & CTA Buttons */}
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg font-semibold text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-base transform hover:scale-105 hover:shadow-md animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500 animate-in:delay-200"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              <span className="px-3 py-2 text-gray-700 font-medium animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500 animate-in:delay-100">
                Hi, {user.name}
              </span>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-2 rounded-lg font-semibold text-red-600 bg-white border border-red-100 hover:bg-red-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-200 text-base transform hover:scale-105 hover:shadow-md animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500 animate-in:delay-200"
              >
                Logout
              </button>
            </>
          )}
          {/* Only show Start Creating button if not on generate page */}
          {!isOnGeneratePage && (
            <Link
              to="/generate"
              onClick={handleStartCreating}
              className="group px-5 py-2 rounded-full font-semibold text-white bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-md hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-base transform hover:scale-105 hover:shadow-lg animate-on-scroll opacity-0 translate-y-2 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-500 animate-in:delay-300 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start Creating
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </Link>
          )}
        </div>
      </div>
      {/* Logout Confirmation Popup */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center animate-bounce-in transform scale-95 animate-in:scale-100">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-4 text-gray-900">Confirm Logout</h3>
            <p className="mb-6 text-gray-600">Are you sure you want to log out?</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-all duration-200 transform hover:scale-105"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-200 transform hover:scale-105"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 