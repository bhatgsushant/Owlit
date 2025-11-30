import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu as MenuIcon, LogOut, User, Home, Scan, LogIn, BarChart3 } from 'lucide-react';
import { createPageUrl } from '@/utils'; // Import createPageUrl
import { useAuth } from '@/hooks/useAuth';

// Custom home icon SVG for the drawer
function DrawerHomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
    >
      <defs>
        <linearGradient id="KB1PQjYBsGUWyrsznZa0Sa_EaHvBlFeXuaQ_gr1" x1="7.219" x2="24.781" y1="11.901" y2="29.464" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00e9ff" stopOpacity=".95" />
          <stop offset="1" stopColor="#00e9ff" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="KB1PQjYBsGUWyrsznZa0Sb_EaHvBlFeXuaQ_gr2" x1="24.214" x2="29.501" y1="4.373" y2="9.659" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3519" stopOpacity=".95" />
          <stop offset="1" stopColor="#ff3519" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="KB1PQjYBsGUWyrsznZa0Sc_EaHvBlFeXuaQ_gr3" x1="11.396" x2="20.604" y1="18.189" y2="27.396" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".8" />
          <stop offset=".519" stopColor="#fff" stopOpacity=".5" />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <linearGradient id="KB1PQjYBsGUWyrsznZa0Sd_EaHvBlFeXuaQ_gr4" x1="8.189" x2="23.811" y1="6.619" y2="22.24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3519" stopOpacity=".95" />
          <stop offset="1" stopColor="#ff3519" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="KB1PQjYBsGUWyrsznZa0Se_EaHvBlFeXuaQ_gr5" x1="7.696" x2="27.414" y1="7.112" y2="26.831" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity=".6" />
          <stop offset=".493" stopColor="#fff" stopOpacity="0" />
          <stop offset=".997" stopColor="#fff" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <path fill="url(#KB1PQjYBsGUWyrsznZa0Sa_EaHvBlFeXuaQ_gr1)" d="M28,15.12V25c0,1.66-1.34,3-3,3H7c-1.66,0-3-1.34-3-3v-9.88L15.67,5.11	c0.19-0.16,0.47-0.16,0.66,0L28,15.12z" />
      <path fill="url(#KB1PQjYBsGUWyrsznZa0Sb_EaHvBlFeXuaQ_gr2)" d="M28,5v6.16l-4-3.43V5c0-0.55,0.45-1,1-1h2C27.55,4,28,4.45,28,5z" />
      <path fill="url(#KB1PQjYBsGUWyrsznZa0Sc_EaHvBlFeXuaQ_gr3)" d="M12,28V18c0-0.552,0.448-1,1-1h6c0.552,0,1,0.448,1,1v10H12z" />
      <path fill="url(#KB1PQjYBsGUWyrsznZa0Sd_EaHvBlFeXuaQ_gr4)" d="M29.5,15.93c-0.346,0-0.693-0.119-0.976-0.361L16.326,5.112c-0.188-0.161-0.463-0.161-0.651,0	L3.476,15.568c-0.628,0.539-1.576,0.467-2.115-0.163c-0.54-0.629-0.466-1.576,0.163-2.115L13.722,2.834	c1.319-1.132,3.236-1.132,4.556,0l12.198,10.457c0.629,0.539,0.702,1.486,0.163,2.115C30.342,15.752,29.922,15.93,29.5,15.93z" />
      <path fill="url(#KB1PQjYBsGUWyrsznZa0Se_EaHvBlFeXuaQ_gr5)" d="M16,2.486c0.711,0,1.405,0.259,1.952,0.728l5.722,4.905L24.5,8.827V7.74V5	c0-0.276,0.224-0.5,0.5-0.5h2c0.276,0,0.5,0.224,0.5,0.5v6.168v0.23l0.175,0.15l2.476,2.123c0.203,0.174,0.326,0.416,0.346,0.682	c0.021,0.266-0.064,0.524-0.238,0.727c-0.19,0.222-0.467,0.349-0.759,0.349c-0.238,0-0.469-0.085-0.65-0.241l-0.524-0.449	L27.5,14.032v1.087V25c0,1.378-1.122,2.5-2.5,2.5H7c-1.378,0-2.5-1.122-2.5-2.5v-9.881v-1.087L3.675,14.74l-0.524,0.449	C2.97,15.344,2.739,15.43,2.5,15.43c-0.293,0-0.569-0.127-0.759-0.349c-0.174-0.203-0.258-0.461-0.238-0.727	c0.021-0.266,0.144-0.509,0.346-0.682L14.048,3.214C14.595,2.744,15.289,2.486,16,2.486 M16,1.986c-0.809,0-1.618,0.283-2.278,0.849	L1.524,13.291c-0.629,0.539-0.702,1.486-0.163,2.115C1.658,15.752,2.078,15.93,2.5,15.93c0.346,0,0.693-0.119,0.976-0.361L4,15.119	V25c0,1.66,1.34,3,3,3h18c1.66,0,3-1.34,3-3v-9.881l0.524,0.449c0.283,0.243,0.63,0.361,0.976,0.361	c0.422,0,0.843-0.178,1.139-0.524c0.54-0.629,0.466-1.576-0.163-2.115L28,11.168V5c0-0.55-0.45-1-1-1h-2c-0.55,0-1,0.45-1,1v2.74	l-5.722-4.905C17.618,2.269,16.809,1.986,16,1.986L16,1.986z" />
    </svg>
  );
}

const DrawerInsightsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <defs>
      <linearGradient id="purple-glow" x1="0" y1="0" x2="64" y2="64">
        <stop stopColor="#C084FC" />
        <stop offset="0.5" stopColor="#A855F7" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
      <filter id="frost">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id="glow">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect
      x="10"
      y="10"
      width="44"
      height="44"
      rx="16"
      fill="white"
      fillOpacity="0.12"
      stroke="white"
      strokeOpacity="0.45"
      strokeWidth="1.2"
      filter="url(#frost)"
    />
    <g fill="url(#purple-glow)" filter="url(#glow)">
      <rect x="22" y="34" width="6" height="12" rx="2" />
      <rect x="31" y="28" width="6" height="18" rx="2" />
      <rect x="40" y="20" width="6" height="26" rx="2" />
    </g>
  </svg>
);

const DrawerScanIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="neon" x1="0" y1="0" x2="64" y2="64">
        <stop stopColor="#06B6D4" />
        <stop offset="0.5" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
    <g stroke="url(#neon)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)">
      <path d="M20 22V18C20 16.9 20.9 16 22 16H26" />
      <path d="M38 16H42C43.1 16 44 16.9 44 18V22" />
      <path d="M20 42V46C20 47.1 20.9 48 22 48H26" />
      <path d="M38 48H42C43.1 48 44 47.1 44 46V42" />
      <rect x="26" y="26" width="12" height="12" rx="3" />
    </g>
  </svg>
);

const DrawerAccountIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 120 120"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <defs>
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
      <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
      </linearGradient>
      <filter id="glassBlur" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0.25 0"
          result="shadow"
        />
        <feBlend in="SourceGraphic" in2="shadow" mode="normal" />
      </filter>
      <linearGradient id="glassStroke" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="60" fill="url(#bgGradient)" />
    <g filter="url(#glassBlur)">
      <rect x="20" y="20" width="80" height="80" rx="26" fill="url(#glassGradient)" stroke="url(#glassStroke)" strokeWidth="1.5" />
    </g>
    <circle cx="60" cy="52" r="14" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    <path
      d="M38 82C41 70 49 64 60 64C71 64 79 70 82 82"
      fill="none"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="60" cy="60" r="32" fill="rgba(255,255,255,0.08)" />
  </svg>
);

const DrawerMultiScanIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="h-5 w-5 shrink-0"
  >
    <defs>
      <linearGradient id="neon-purple" x1="0" y1="0" x2="64" y2="64">
        <stop stopColor="#C084FC" />
        <stop offset="0.5" stopColor="#A855F7" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
      <filter id="neon-glow">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="16" y="16" width="32" height="40" rx="6" stroke="url(#neon-purple)" strokeWidth="2" fill="none" opacity="0.5" />
    <rect x="20" y="12" width="32" height="40" rx="6" stroke="url(#neon-purple)" strokeWidth="2" fill="none" filter="url(#neon-glow)" />
    <g stroke="url(#neon-purple)" strokeWidth="3" strokeLinecap="round" filter="url(#neon-glow)">
      <path d="M26 26V22C26 20.9 26.9 20 28 20H32" />
      <path d="M40 20H44C45.1 20 46 20.9 46 22V26" />
      <path d="M26 42V46C26 47.1 26.9 48 28 48H32" />
      <path d="M40 48H44C45.1 48 46 47.1 46 46V42" />
    </g>
  </svg>
);

// Shared brand mark to mirror the home page styling
function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ scale: 1.08, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-lg shadow-black/30"
      >
       <svg viewBox="0 0 128 128" width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <path fill="white" d="
    M28 34 64 16 100 34 100 92
    C100 108 84 116 64 116
    C44 116 28 108 28 92
    Z"/>
  <circle cx="48" cy="60" r="9" fill="black"/>
  <circle cx="80" cy="60" r="9" fill="black"/>
  <polygon points="64,72 56,86 72,86" fill="black"/>
</svg>

      </motion.div>
      <span className="text-xl font-bold text-black font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
        Owlit
      </span>
    </div>
  );
}


// Main component for the modern navigation bar
export default function ModernNavbar({ isDarkMode, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);
  const { user, logout, fetchWithAuth } = useAuth();
  const { scrollYProgress } = useScroll();
  const scrollIndicator = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });
  const [familyStatus, setFamilyStatus] = useState({ family: null, members: [], invite: null, membership: null });
  const [familyStatusLoading, setFamilyStatusLoading] = useState(false);
  const [familyActionLoading, setFamilyActionLoading] = useState(false);
  const [familyActionMessage, setFamilyActionMessage] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [familyActionMode, setFamilyActionMode] = useState('create'); // 'create' | 'join'
  const [familySectionOpen, setFamilySectionOpen] = useState(true);
  const avatarUrl = useMemo(
    () => user?.avatar || user?.picture || user?.photoURL || user?.photo || user?.image || user?.avatar_url,
    [user]
  );
  const displayName = useMemo(
    () => user?.displayName || user?.name || user?.email || 'Account',
    [user]
  );
  const avatarInitial = displayName?.[0]?.toUpperCase() || 'A';

  // Menu items configuration
  const menuItems = useMemo(() => {
    const items = [
      { name: 'Home', href: createPageUrl('Home') },
      { name: 'Scan', href: createPageUrl('ScanReceipt') },
    ];
    if (user) {
      items.splice(1, 0, { name: 'Insights', href: createPageUrl('Insights') });
      items.push({ name: 'Account', href: createPageUrl('Account') });
    }
    return items;
  }, [user]);

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

  const readErrorMessage = useCallback(async (response) => {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) return parsed.error;
    } catch {
      // ignore parse errors
    }
    return text || 'Request failed';
  }, []);

  const fetchFamilyStatus = useCallback(async () => {
    if (!user) {
      setFamilyStatus({ family: null, members: [], invite: null, membership: null });
      return;
    }
    setFamilyStatusLoading(true);
    setFamilyActionMessage(null);
    try {
      const response = await fetchWithAuth('/api/family/status');
      if (!response.ok) {
        throw new Error('Failed to load family status');
      }
      const payload = await response.json();
      setFamilyStatus({
        family: payload.family || null,
        members: payload.members || [],
        invite: payload.invite || null,
        membership: payload.membership || null,
      });
    } catch (err) {
      console.error(err);
      setFamilyStatus({ family: null, members: [], invite: null, membership: null });
      setFamilyActionMessage('Unable to load family status right now.');
    } finally {
      setFamilyStatusLoading(false);
    }
  }, [fetchWithAuth, user]);

  useEffect(() => {
    if (isProfileOpen) {
      fetchFamilyStatus();
    }
  }, [isProfileOpen, fetchFamilyStatus]);

  const handleCreateFamily = async () => {
    if (!familyNameInput.trim()) {
      setFamilyActionMessage('Please enter a family name.');
      return;
    }
    setFamilyActionLoading(true);
    setFamilyActionMessage(null);
    try {
      const response = await fetchWithAuth('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyNameInput.trim() }),
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || 'Failed to create family');
      }
      setFamilyNameInput('');
      await fetchFamilyStatus();
      setFamilyActionMessage('Family created. Share the invite code below.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage(err.message || 'Failed to create family.');
    } finally {
      setFamilyActionLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setFamilyActionLoading(true);
    setFamilyActionMessage(null);
    try {
      const response = await fetchWithAuth('/api/family/invite', { method: 'POST' });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || 'Failed to generate invite code');
      }
      await fetchFamilyStatus();
      setFamilyActionMessage('New invite code generated.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage(err.message || 'Failed to generate invite code.');
    } finally {
      setFamilyActionLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!joinCodeInput.trim()) {
      setFamilyActionMessage('Please enter a join code.');
      return;
    }
    setFamilyActionLoading(true);
    setFamilyActionMessage(null);
    try {
      const response = await fetchWithAuth('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCodeInput.trim() }),
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || 'Failed to join family');
      }
      setJoinCodeInput('');
      await fetchFamilyStatus();
      setFamilyActionMessage('Joined family successfully.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage(err.message || 'Failed to join family.');
    } finally {
      setFamilyActionLoading(false);
    }
  };

  const handleLeaveFamily = async () => {
    setFamilyActionLoading(true);
    setFamilyActionMessage(null);
    try {
      const response = await fetchWithAuth('/api/family/leave', { method: 'POST' });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || 'Failed to leave family');
      }
      await fetchFamilyStatus();
      setFamilyActionMessage('You have left the family.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage(err.message || 'Failed to leave family.');
    } finally {
      setFamilyActionLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    const code = familyStatus?.invite?.code || familyStatus?.family?.join_code || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setFamilyActionMessage('Invite code copied.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage('Unable to copy invite code.');
    }
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
                    relative flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] transition-colors
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
          {user ? (
            <motion.div className="relative" whileHover={{ scale: 1.02 }}>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-3 py-1 shadow-sm dark:bg-slate-800/80"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-800">
                    {avatarInitial}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{displayName}</span>
              </button>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-[55vw] max-w-[260px] bg-white text-black backdrop-blur-2xl border-l border-black/10 rounded-l-3xl flex flex-col items-start justify-start gap-4 text-left pt-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 rounded-full border border-black/10 bg-black/5 p-2 text-black hover:bg-black/10"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
              <div className="mb-2 self-start pl-6">
                <BrandMark />
              </div>
              <div className="flex flex-col items-start w-full h-full px-6 font-playfair text-sm text-black">
                <div className="flex flex-col w-full gap-4 pt-2 text-black">
                  {(() => {
                    const iconMap = {
                      Home: DrawerHomeIcon,
                      Scan: DrawerScanIcon,
                      Insights: DrawerInsightsIcon,
                      Account: DrawerAccountIcon,
                      Login: LogIn,
                      'Scan Multiple Pages': DrawerMultiScanIcon,
                    };
                    const baseLinks = [...menuItems, { name: 'Scan Multiple Pages', href: createPageUrl('ScanReceiptMulti') }];
                    const authLink = user
                      ? { name: 'Account', href: createPageUrl('Account') }
                      : { name: 'Login', href: createPageUrl('Login') };
                    const links = [...baseLinks, authLink].filter(
                      (link, idx, arr) => arr.findIndex((l) => l.name === link.name) === idx
                    );
                    return links.map((item) => {
                      const Icon = iconMap[item.name] || User;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-black hover:text-emerald-600 transition-colors"
                        >
                          <Icon size={20} className="shrink-0 text-black" />
                          <span className="leading-none">{item.name}</span>
                        </Link>
                      );
                    });
                  })()}
                </div>
                {user ? (
                  <div className="mt-auto w-full pb-6 pt-4">
                    <button
                      onClick={logout}
                      className="inline-flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-red-600 hover:text-red-500"
                    >
                      <LogOut size={20} className="shrink-0 text-red-600" />
                      <span className="leading-none text-red-600">Logout</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProfileOpen && user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
            onClick={() => setIsProfileOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="relative h-full w-full max-w-xs bg-white text-slate-900 dark:bg-black dark:text-white shadow-2xl border-l border-slate-200 dark:border-white/10 p-6 flex flex-col rounded-l-3xl text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-semibold text-emerald-800">
                      {avatarInitial}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 dark:text-white/60">Signed in</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-white/60">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="rounded-full p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setFamilySectionOpen((prev) => !prev)}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/50 mb-1">Family status</p>
                      {familyStatusLoading ? (
                        <p className="text-slate-600 dark:text-white/70">Loading…</p>
                      ) : familyStatus.family ? (
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{familyStatus.family.name}</p>
                      ) : (
                        <p className="text-slate-600 dark:text-white/70">Not in a family yet.</p>
                      )}
                    </div>
                    <span className="text-slate-500 dark:text-white/60 text-sm">
                      {familySectionOpen ? '–' : '+'}
                    </span>
                  </button>
                  {familySectionOpen && !familyStatusLoading && familyStatus.family && (
                    <div className="mt-2 space-y-1">
                      <p className="text-slate-600 dark:text-white/70 text-xs">Members: {familyStatus.members?.length || 0}</p>
                      <p className="text-slate-600 dark:text-white/70 text-xs">Role: {familyStatus.membership?.role || 'member'}</p>
                      {familyStatus.members?.length ? (
                        <ul className="mt-2 space-y-1">
                          {familyStatus.members.map((member) => {
                            const display =
                              member.member_name ||
                              member.member_email ||
                              member.user_id ||
                              'Member';
                            return (
                              <li
                                key={member.user_id || member.member_email || Math.random()}
                                className="text-sm text-slate-700 dark:text-white/75 flex items-center gap-2"
                              >
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span>{display}</span>
                                {member.role && (
                                  <span className="text-xs text-slate-500 dark:text-white/60">
                                    ({member.role})
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-white/60">No member names available.</p>
                      )}
                    </div>
                  )}
                </div>

                {familySectionOpen && !familyStatus.family && (
                  <div className="rounded-xl border border-slate-200 bg-gray-50 p-3 space-y-3 dark:border-white/10 dark:bg-white/5">
                    <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-white/15 dark:bg-white/10">
                      <button
                        onClick={() => setFamilyActionMode('create')}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                          familyActionMode === 'create'
                            ? 'bg-emerald-500 text-black'
                            : 'text-slate-700 hover:text-slate-900 dark:text-white/80 dark:hover:text-white'
                        }`}
                      >
                        Create a family
                      </button>
                      <button
                        onClick={() => setFamilyActionMode('join')}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                          familyActionMode === 'join'
                            ? 'bg-emerald-500 text-black'
                            : 'text-slate-700 hover:text-slate-900 dark:text-white/80 dark:hover:text-white'
                        }`}
                      >
                        Join a family
                      </button>
                    </div>

                    {familyActionMode === 'create' ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Create a family</p>
                        <input
                          type="text"
                          value={familyNameInput}
                          onChange={(e) => setFamilyNameInput(e.target.value)}
                          placeholder="Family name"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 dark:border-white/15 dark:bg-white/10 dark:text-white"
                        />
                          <button
                            onClick={handleCreateFamily}
                            disabled={familyActionLoading || !familyNameInput.trim()}
                            className="w-full rounded-lg bg-emerald-500 text-black font-semibold px-3 py-2 hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {familyActionLoading ? 'Creating…' : 'Create family'}
                          </button>
                        </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Join a family</p>
                        <input
                          type="text"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder="Enter code"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 dark:border-white/15 dark:bg-white/10 dark:text-white"
                        />
                        <button
                          onClick={handleJoinFamily}
                          disabled={familyActionLoading || !joinCodeInput.trim()}
                          className="w-full rounded-lg bg-white text-black font-semibold px-3 py-2 hover:bg-white/90 disabled:opacity-60"
                        >
                          {familyActionLoading ? 'Joining…' : 'Join family'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {familySectionOpen && familyStatus.family && (
                  <div className="rounded-xl border border-slate-200 bg-gray-50 p-3 space-y-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-white/50">Invite code</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {familyStatus?.invite?.code || familyStatus?.family?.join_code || '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (familyStatus?.invite?.code || familyStatus?.family?.join_code) {
                              handleCopyInvite();
                            } else {
                              handleGenerateInvite();
                            }
                          }}
                          disabled={familyActionLoading}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          {familyStatus?.invite?.code || familyStatus?.family?.join_code ? 'Copy' : 'Generate'}
                        </button>
                        <button
                          onClick={() => {
                            handleGenerateInvite();
                          }}
                          disabled={familyActionLoading}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-50 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          New
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveFamily}
                      disabled={familyActionLoading}
                      className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-400 hover:bg-red-500/20 disabled:opacity-60 dark:text-red-100"
                    >
                      Leave family
                    </button>
                  </div>
                )}

                {familyActionMessage && <p className="text-xs text-slate-600 dark:text-white/70">{familyActionMessage}</p>}

                <button
                  onClick={() => { setIsProfileOpen(false); logout(); }}
                  className="flex items-center justify-between gap-2 w-full rounded-lg border border-slate-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:border-emerald-400 hover:bg-white/60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <span>Logout</span>
                  <LogOut size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
