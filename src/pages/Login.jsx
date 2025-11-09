import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import Lottie from 'lottie-react';

const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? 'http://localhost:3001' : '')
).replace(/\/$/, '');

const LoginPage = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/login-lottie-yellow.json')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Failed to load animation'))))
      .then((data) => {
        if (isMounted) setAnimationData(data);
      })
      .catch(() => {
        if (isMounted) setAnimationData(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = (provider) => {
    const authBase = import.meta.env.VITE_SERVER_URL;
    window.location.href = `${authBase}/auth/${provider}`;
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0b1120] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_50%),_radial-gradient(circle_at_bottom,_rgba(96,165,250,0.35),_transparent_45%)] blur-[220px]" />

      <div className="relative grid w-full max-w-4xl grid-cols-1 gap-6 rounded-[36px] border border-white/15 bg-white/8 p-8 backdrop-blur-[55px] shadow-[0_45px_140px_rgba(7,10,24,0.7)] md:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[30px] border border-white/15 bg-white/10 p-8 text-center text-white shadow-[0_35px_110px_rgba(8,12,30,0.55)] backdrop-blur-3xl md:p-7 lg:p-8"
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 128 128" className="w-7 h-7" aria-hidden="true">
                <defs>
                  <linearGradient id="login-white-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.65" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#login-white-grad)"
                  d="M40 60 c-10 -20 10 -40 36 -36 c18 3 32 22 28 36 c8 4 14 12 14 20 c0 14 -14 24 -32 24 H46 c-18 0 -32 -10 -32 -24 c0 -9 6 -16 14 -20 z"
                />
                <rect x="58" y="84" width="12" height="26" rx="4" fill="url(#login-white-grad)" />
              </svg>
            </div>
            <span className="text-3xl font-extrabold text-white">
              Owlit
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-slate-300 mt-2">Sign in to access your intelligent Owlit.</p>

          <div className="flex flex-col gap-4 mt-10">
            <Button
              onClick={() => handleLogin('google')}
              className="flex items-center justify-center w-full h-14 rounded-xl bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <FcGoogle className="mr-3 h-6 w-6" />
              Sign in with Google
            </Button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative hidden md:flex items-center justify-center"
        >
          <div className="relative w-full h-full min-h-[420px] rounded-[32px] border border-white/10 bg-white/5 px-8 py-6 shadow-[0_35px_140px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden">
            {animationData ? (
              <Lottie animationData={animationData} loop className="absolute inset-0 h-full w-full object-contain scale-105 px-4" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Loading animation…
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
