import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu as MenuIcon, Sun, Moon } from 'lucide-react';
import { createPageUrl } from '@/utils'; // Import createPageUrl

// A simple SVG logo component
function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 3h6l2 4-2 4H9Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


// Main component for the modern navigation bar
export default function ModernNavbar({ isDarkMode, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  // Menu items configuration
  const menuItems = [
    { name: 'Home', href: createPageUrl('Home') },
    { name: 'Dashboard', href: createPageUrl('Dashboard') },
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

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between h-20 px-6 bg-gray-900 text-white">
        {/* Logo */}
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-bold">ReceiptWise</span>
        </Link>

        {/* Desktop Menu (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-8">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={`relative text-sm font-medium transition-colors hover:text-gray-300 ${
                location.pathname === item.href ? 'text-white' : 'text-gray-400'
              }`}
            >
              {item.name}
              {location.pathname === item.href && (
                <motion.div
                  layoutId="underline"
                  className="absolute -bottom-1 left-0 w-full h-0.5 bg-white"
                />
              )}
            </Link>
          ))}
        </div>

        {/* Action Buttons & Theme Toggle (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4">
          <button onClick={toggleTheme} className="text-gray-400 hover:text-white">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" className="text-sm font-medium text-gray-400 hover:text-white">
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-colors"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            {isOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {/* Full-screen Overlay Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: '0%' }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-lg h-screen w-screen flex flex-col items-center justify-center md:hidden"
          >
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
                <Link to="/login" className="text-xl font-medium text-gray-400 hover:text-white">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-6 py-3 text-lg font-semibold text-black bg-white rounded-full hover:bg-gray-200 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
