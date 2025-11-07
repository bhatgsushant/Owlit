import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu as MenuIcon, Sun, Moon, LogOut, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils'; // Import createPageUrl
import { useAuth } from '@/hooks/useAuth';

// Shared brand mark to mirror the home page styling
function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.08, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25"
      >
        <Sparkles className="h-5 w-5 text-white" />
      </motion.div>
      <div className="flex flex-col leading-none">
        <span className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500 bg-clip-text text-base font-semibold tracking-tight text-transparent">
          ReceiptWise
        </span>
        <span className="text-[11px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
          track · save · thrive
        </span>
      </div>
    </div>
  );
}


// Main component for the modern navigation bar
export default function ModernNavbar({ isDarkMode, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);
  const { user, logout } = useAuth();
  const { scrollYProgress } = useScroll();
  const scrollIndicator = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  // Menu items configuration
  const menuItems = [
    { name: 'Home', href: createPageUrl('Home') },
    { name: 'Dashboard', href: createPageUrl('Dashboard') },
    { name: 'Insights', href: createPageUrl('Insights') },
    { name: 'Scan', href: createPageUrl('ScanReceipt') },
  ];

  // Close menu when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const desktopLinkVariants = {
    initial: { opacity: 0.7, y: 4 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
    whileHover: { opacity: 1, y: -2, transition: { duration: 0.2 } },
  };

  const navVariants = {
    hidden: { y: -16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  };

  return (
    <motion.nav
      ref={navRef}
      variants={navVariants}
      initial="hidden"
      animate="visible"
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-3"
    >
      <motion.div
        className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/60 px-5 shadow-lg shadow-black/10 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-slate-900/70"
        animate={{
          backgroundColor: hasScrolled
            ? (isDarkMode ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)')
            : (isDarkMode ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.65)'),
          borderColor: hasScrolled
            ? (isDarkMode ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.25)')
            : 'rgba(255,255,255,0.12)',
        }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link to={createPageUrl('Home')} className="text-slate-900 dark:text-white">
          <BrandMark />
        </Link>

        <motion.div className="hidden items-center gap-5 md:flex">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                variants={desktopLinkVariants}
                initial="initial"
                animate="animate"
                whileHover="whileHover"
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    relative flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors
                    ${isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}
                  `}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-emerald-500/15 dark:bg-emerald-400/15"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="hidden items-center gap-3 md:flex">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="rounded-full border border-slate-300/60 bg-white/40 p-2 text-slate-600 shadow-sm hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-500/60 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:text-emerald-300"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>
          {user ? (
            <motion.div className="relative group" whileHover={{ scale: 1.02 }}>
              <button className="flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-3 py-1 shadow-sm dark:bg-slate-800/80">
                <img src={user.avatar} alt={user.displayName} className="h-8 w-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.displayName}</span>
              </button>
              <div className="pointer-events-none absolute right-0 mt-3 w-48 rounded-2xl border border-white/10 bg-white/90 py-2 opacity-0 shadow-xl shadow-black/10 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 dark:bg-slate-900/90">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 transition-colors hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-300"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </motion.div>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-transparent bg-emerald-500/90 px-4 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-500"
            >
              Login
            </Link>
          )}
        </div>

        <div className="md:hidden">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-full border border-white/30 bg-white/60 p-2 text-slate-700 shadow-sm dark:bg-slate-800/70 dark:text-slate-200"
          >
            {isOpen ? <X size={22} /> : <MenuIcon size={22} />}
          </motion.button>
        </div>
      </motion.div>
      <motion.div
        className="pointer-events-none mx-auto mt-2 hidden h-1 w-[90%] max-w-5xl rounded-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent md:block"
        style={{ scaleX: scrollIndicator }}
      />

      {/* Full-screen Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: '0%' }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 flex h-screen w-screen flex-col items-center justify-center bg-black bg-opacity-90 backdrop-blur-lg md:hidden"
          >
            <div className="mb-10">
              <BrandMark />
            </div>
            <div className="flex flex-col items-center gap-8">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-3xl font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col items-center gap-6 mt-8">
                <button onClick={toggleTheme} className="text-gray-400 hover:text-white flex items-center gap-2">
                  {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
                  <span className="text-xl font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                {user ? (
                  <button onClick={logout} className="text-xl font-medium text-gray-400 hover:text-white flex items-center">
                    <LogOut size={20} className="mr-2" />
                    Logout
                  </button>
                ) : (
                  <Link to="/login" className="text-xl font-medium text-gray-400 hover:text-white">
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
