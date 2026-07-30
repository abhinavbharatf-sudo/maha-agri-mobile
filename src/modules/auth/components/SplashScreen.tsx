/**
 * SplashScreen Component
 * Branded Splash Screen for MAHA-AGRI Enterprise Platform.
 */

import React from 'react';
import { Sprout, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  appName?: string;
  subtext?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  appName = 'MAHA-AGRI',
  subtext = 'Empowering Farmers & Agriculture Ecosystem',
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 text-white px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -top-10 -left-10" />
      <div className="absolute w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -bottom-10 -right-10" />

      {/* Main Logo & Branding */}
      <div className="relative flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-600 to-primary-600 rounded-2xl flex items-center justify-center shadow-2xl ring-2 ring-emerald-400/30 mb-6 animate-pulse">
          <Sprout className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          {appName} <span className="text-emerald-400 font-light">Enterprise</span>
        </h1>
        <p className="text-sm sm:text-base text-primary-300 max-w-sm mb-10 leading-relaxed font-medium">
          {subtext}
        </p>

        {/* Loading Spinner */}
        <div className="flex items-center gap-3 bg-primary-900/80 backdrop-blur border border-primary-700/50 px-5 py-2.5 rounded-full shadow-inner">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-primary-200 font-medium tracking-wide">
            Initializing Secure Session…
          </span>
        </div>
      </div>

      {/* Footer Security Badge */}
      <div className="absolute bottom-6 flex items-center gap-1.5 text-xs text-primary-400 font-medium z-10">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Enterprise Encrypted Platform</span>
      </div>
    </div>
  );
};
