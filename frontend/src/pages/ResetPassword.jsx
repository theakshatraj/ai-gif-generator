import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

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

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reset password');
      }
      const data = await response.json();
      setSuccess(data.message || 'Password has been reset successfully. You can now close this window.');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set new password</h1>
          <p className="text-gray-600">Choose a strong password for your account</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 pr-12 ${
                    (password && (passwordStrength === 'Too short' || passwordStrength === 'Easy')) 
                      ? 'border-red-300 focus:border-red-400' 
                      : 'border-gray-200 focus:border-indigo-400'
                  }`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 pr-12 ${
                    confirmPassword && !passwordsMatch ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-indigo-400'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(sp => !sp)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passwords do not match
                </div>
              )}
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
                  Resetting password...
                </div>
              ) : (
                'Reset password'
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

export default ResetPassword; 