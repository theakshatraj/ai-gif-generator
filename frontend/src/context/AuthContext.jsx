import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Optionally, fetch user profile here
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  const signup = async (data) => {
    const res = await api.signup(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  };

  const login = async (data) => {
    const res = await api.login(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    return res;
  };

  const logout = (navigate) => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to dashboard after logout
    if (navigate) {
      navigate('/');
    }
  };

  const forgotPassword = async (email) => {
    return api.forgotPassword(email);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signup, login, logout, forgotPassword, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 