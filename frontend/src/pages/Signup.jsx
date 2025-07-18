import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';

const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;

function getPasswordStrength(password) {
  if (password.length < 6) return 'Too short';
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  if (score <= 2) return 'Easy';
  if (score === 3) return 'Medium';
  if (score >= 4) return 'Hard';
}

const EyeIcon = ({ open }) => (
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.293 5.03M15 12a3 3 0 11-6 0 3 3 0 016 0zm-6.364 6.364L6 18m0 0l-2-2m2 2l2-2m8 2l2-2m-2 2l-2-2" /></svg>
  )
);

const Signup = () => {
  const { signup, setUser, setToken } = useAuth ? useAuth() : {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(password);
  const emailValid = emailRegex.test(email);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  useEffect(() => {
    // Add entrance animation
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      document.body.style.overflow = 'auto';
    }, 1000);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!emailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (passwordStrength === 'Too short' || passwordStrength === 'Easy') {
      setError('Password is too weak.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signup({ name, email, password });
      navigate('/generate');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (token, user) => {
    if (setToken && setUser) {
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    navigate('/generate');
  };
  const handleGoogleError = (err) => {
    setError(err.message || 'Google sign-in failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7ff] via-[#f5f8ff] to-[#f0f4ff] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-purple-300 rounded-full animate-pulse opacity-60 particle"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-40 particle"></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse opacity-50 particle"></div>
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-30 particle"></div>
        <div className="absolute top-1/2 left-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse opacity-40 particle"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-1000">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 group-hover:scale-105 transition-transform shadow-lg hover:shadow-xl">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" className="h-7 w-7 group-hover:rotate-12 transition-transform duration-300">
                <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-200">
            Create your account
          </h1>
          <p className="text-gray-600 animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-400">
            Join GifCraft AI and start creating amazing GIFs
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-on-scroll opacity-0 translate-y-8 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-1000 animate-in:delay-300 relative overflow-hidden group">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-bounce-in">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-500">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 transform hover:scale-[1.02] ${
                  !name && error ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-indigo-400'
                }`}
                placeholder="Enter your full name"
              />
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-600">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 transform hover:scale-[1.02] ${
                  (!emailValid && email) || (error && !emailValid) 
                    ? 'border-red-300 focus:border-red-400' 
                    : 'border-gray-200 focus:border-indigo-400'
                }`}
                placeholder="Enter your email"
              />
              {(!emailValid && email) && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-slide-down">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Please enter a valid email address
                </div>
              )}
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-700">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 pr-12 transform hover:scale-[1.02] ${
                    (password && (passwordStrength === 'Too short' || passwordStrength === 'Easy')) 
                      ? 'border-red-300 focus:border-red-400' 
                      : 'border-gray-200 focus:border-indigo-400'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 transform hover:scale-110"
                  onClick={() => setShowPassword(sp => !sp)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {password && (
                <div className={`mt-2 text-sm font-medium flex items-center gap-1 ${
                  passwordStrength === 'Hard' ? 'text-green-600' : 
                  passwordStrength === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Password strength: {passwordStrength}
                </div>
              )}
            </div>

            <div className="animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-800">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 pr-12 transform hover:scale-[1.02] ${
                    confirmPassword && !passwordsMatch ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-indigo-400'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 transform hover:scale-110"
                  onClick={() => setShowConfirmPassword(sp => !sp)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-slide-down">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passwords do not match
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-xl animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-900 relative overflow-hidden group" 
              disabled={loading}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-1000">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div className="animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-1100">
            <GoogleSignInButton onAuthSuccess={handleGoogleSuccess} onAuthError={handleGoogleError} />
          </div>

          {/* Links */}
          <div className="mt-6 text-center animate-on-scroll opacity-0 translate-y-4 animate-in:opacity-100 animate-in:translate-y-0 animate-in:duration-700 animate-in:delay-1200">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors duration-200 transform hover:scale-105">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup; 