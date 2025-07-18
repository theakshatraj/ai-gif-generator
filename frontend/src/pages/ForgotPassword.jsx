import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf7ff] via-[#f5f8ff] to-[#f0f4ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 group-hover:scale-105 transition-transform shadow-lg">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" className="h-7 w-7">
                <path d="M13 2L3 14h7v8l8-12h-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h1>
          <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                placeholder="Enter your email address"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending reset email...
                </div>
              ) : (
                'Send reset email'
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 