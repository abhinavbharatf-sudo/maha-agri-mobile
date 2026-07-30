import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth/AuthContext';
import { FeatureFlagProvider } from './lib/flags/FlagProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeatureFlagProvider>
          <App />
        </FeatureFlagProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
