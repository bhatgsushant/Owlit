import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const handleLogin = (provider) => {
    window.location.href = `http://localhost:3001/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-100 via-pink-100 to-blue-100 dark:from-black dark:via-gray-900 dark:to-black flex items-center justify-center p-4 relative overflow-hidden">
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md p-8 rounded-3xl bg-white/30 dark:bg-gray-900/30 backdrop-blur-[30px] border border-white/20 dark:border-gray-700/30 shadow-[0_20px_50px_rgba(0,0,0,0.2)]"
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

        {/* Buttons */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => handleLogin('google')}
            className="flex items-center justify-center w-full h-14 rounded-xl bg-gradient-to-r from-red-400 to-red-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Sign in with Google
          </Button>

          <Button
            onClick={() => handleLogin('github')}
            className="flex items-center justify-center w-full h-14 rounded-xl bg-gray-800 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Sign in with GitHub
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        {/* Animated Glow */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 blur-xl opacity-30 animate-animate-glow pointer-events-none"></div>
      </motion.div>

      <style>{`
        @keyframes animate-glow {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
        .animate-animate-glow {
          animation: animate-glow 6s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
