import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import Lottie from 'lottie-react';

const LoginPage = () => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/images/Login%20lottie%20yellow.json')
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
    window.location.href = `http://localhost:3001/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-100 via-pink-100 to-blue-100 dark:from-black dark:via-gray-900 dark:to-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -inset-16 bg-gradient-to-br from-emerald-400/10 via-purple-500/20 to-blue-500/10 blur-[180px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md p-8 rounded-3xl bg-white/15 dark:bg-white/[0.08] backdrop-blur-[45px] border border-white/25 dark:border-gray-700/40 shadow-[0_35px_90px_rgba(15,23,42,0.35)] before:absolute before:inset-0 before:rounded-3xl before:border before:border-white/40 before:opacity-50 before:pointer-events-none after:absolute after:-inset-1 after:bg-gradient-to-br after:from-white/[0.08] after:via-white/[0.02] after:to-transparent after:rounded-[26px] after:blur-[12px] after:opacity-70 after:pointer-events-none"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-extrabold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              ReceiptWise
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Sign in to access your intelligent memory hub.</p>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="w-56 h-56 rounded-2xl border border-white/30 dark:border-gray-700/40 bg-white/20 dark:bg-white/5 shadow-inner flex items-center justify-center overflow-hidden">
            {animationData ? (
              <Lottie animationData={animationData} loop className="w-full h-full object-contain" />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading animation…</div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => handleLogin('google')}
            className="flex items-center justify-center w-full h-14 rounded-xl bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <FcGoogle className="mr-3 h-6 w-6" />
            Sign in with Google
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
