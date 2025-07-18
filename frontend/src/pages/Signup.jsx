import React, { useState } from 'react';
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        <div className="mb-4">
          <label className="block mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className={`w-full px-3 py-2 border rounded ${!name && error ? 'border-red-500' : ''}`} />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={`w-full px-3 py-2 border rounded ${(!emailValid && email) || (error && !emailValid) ? 'border-red-500' : ''}`}
          />
          {(!emailValid && email) && <div className="text-red-500 text-xs mt-1">Please enter a valid email address.</div>}
        </div>
        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded pr-10 ${(password && (passwordStrength === 'Too short' || passwordStrength === 'Easy')) ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(sp => !sp)}
              tabIndex={-1}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {password && (
            <div className={`mt-2 text-sm font-semibold ${passwordStrength === 'Hard' ? 'text-green-600' : passwordStrength === 'Medium' ? 'text-yellow-600' : 'text-red-600'}`}>
              Password strength: {passwordStrength}
            </div>
          )}
        </div>
        <div className="mb-6">
          <label className="block mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded pr-10 ${confirmPassword && !passwordsMatch ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowConfirmPassword(sp => !sp)}
              tabIndex={-1}
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
          {confirmPassword && !passwordsMatch && <div className="text-red-500 text-xs mt-1">Passwords do not match.</div>}
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <GoogleSignInButton onAuthSuccess={handleGoogleSuccess} onAuthError={handleGoogleError} />
        
        <div className="flex flex-col items-center mt-4 text-sm">
          <span className="mb-1">Already have an account?</span>
          <Link to="/login" className="text-blue-600 hover:underline">Sign in here</Link>
        </div>
      </form>
    </div>
  );
};

export default Signup; 