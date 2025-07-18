import React, { useEffect, useRef } from 'react';
import api from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID_PLACEHOLDER';

const GoogleSignInButton = ({ onAuthSuccess, onAuthError }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google && !document.getElementById('google-client-script')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.id = 'google-client-script';
      script.onload = renderButton;
      document.body.appendChild(script);
    } else {
      renderButton();
    }
    // eslint-disable-next-line
  }, []);

  function renderButton() {
    if (window.google && buttonRef.current) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 260,
        text: 'continue_with',
        shape: 'pill',
      });
    }
  }

  async function handleCredentialResponse(response) {
    try {
      const res = await api.googleAuth(response.credential);
      if (onAuthSuccess) onAuthSuccess(res.token, res.user);
    } catch (err) {
      if (onAuthError) onAuthError(err);
    }
  }

  return (
    <div className="flex flex-col items-center my-2">
      <div ref={buttonRef}></div>
    </div>
  );
};

export default GoogleSignInButton; 