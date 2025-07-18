import React, { useState } from 'react';
import ApiService from '../services/api';
import { useAuth } from '../AuthContext';

export default function AuthModal({ isOpen, onClose, mode = 'signin' }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(mode); // 'signin' | 'signup' | 'forgot'
  const { login, signup } = useAuth();

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (view === 'signin') {
        await login(form.email, form.password);
        onClose();
      } else if (view === 'signup') {
        if (form.password !== form.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await signup(form.email, form.password);
        setSuccess('Sign up successful! You can now sign in.');
        setView('signin');
      } else if (view === 'forgot') {
        await ApiService.forgotPassword(form.email);
        setSuccess('Password reset email sent!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = ApiService.getGoogleOAuthUrl();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">&times;</button>
        <h2 className="text-2xl font-bold mb-4 text-center">
          {view === 'signin' ? 'Sign In' : view === 'signup' ? 'Sign Up' : 'Forgot Password'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
          {(view === 'signin' || view === 'signup') && (
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
          )}
          {view === 'signup' && (
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
          )}
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            disabled={loading}
          >
            {loading ? 'Please wait...' : view === 'signin' ? 'Sign In' : view === 'signup' ? 'Sign Up' : 'Send Reset Email'}
          </button>
        </form>
        <div className="flex flex-col gap-2 mt-4">
          {view !== 'signin' && (
            <button className="text-indigo-600 hover:underline" onClick={() => { setView('signin'); setError(''); setSuccess(''); }}>Already have an account? Sign In</button>
          )}
          {view !== 'signup' && (
            <button className="text-indigo-600 hover:underline" onClick={() => { setView('signup'); setError(''); setSuccess(''); }}>Need an account? Sign Up</button>
          )}
          {view !== 'forgot' && (
            <button className="text-indigo-600 hover:underline" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}>Forgot Password?</button>
          )}
        </div>
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 font-semibold text-gray-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48"><g><path d="M44.5 20H24v8.5h11.7C34.7 33.1 29.9 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c2.8 0 5.4.9 7.5 2.6l6.4-6.4C34.1 6.5 29.3 4.5 24 4.5 12.7 4.5 4.5 12.7 4.5 24S12.7 43.5 24 43.5c10.5 0 19.5-8.5 19.5-19.5 0-1.3-.1-2.1-.3-3z" fill="#FFC107"/><path d="M6.3 14.7l7 5.1C15.1 17.1 19.2 14 24 14c2.8 0 5.4.9 7.5 2.6l6.4-6.4C34.1 6.5 29.3 4.5 24 4.5c-7.2 0-13.2 4.1-16.3 10.2z" fill="#FF3D00"/><path d="M24 43.5c5.7 0 10.5-1.9 14.1-5.1l-6.5-5.3C29.8 34.7 27 36 24 36c-5.8 0-10.7-3.9-12.5-9.2l-7 5.4C7.8 39.1 15.3 43.5 24 43.5z" fill="#4CAF50"/><path d="M44.5 20H24v8.5h11.7c-1.1 3-4.2 5.5-7.7 5.5-4.5 0-8.2-3.7-8.2-8.2 0-1.3.3-2.5.8-3.5l-7-5.4C7.1 17.1 6 20.4 6 24c0 3.6 1.1 6.9 3.1 9.5l7-5.4c1.8 5.3 6.7 9.2 12.5 9.2 3.1 0 6-.9 8.2-2.5l6.5 5.3C38.5 41.6 31.7 43.5 24 43.5z" fill="#1976D2"/></g></svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
} 