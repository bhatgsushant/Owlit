import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Menu as MenuIcon, Sun, Moon, LogOut, User } from 'lucide-react';
import { createPageUrl } from '@/utils'; // Import createPageUrl
import { useAuth } from '@/hooks/useAuth';

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
        <span className="text-xl font-bold text-black dark:text-white">
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

  // Menu items configuration
  const menuItems = useMemo(() => {
    const items = [
      { name: 'Home', href: createPageUrl('Home') },
      { name: 'Scan', href: createPageUrl('ScanReceipt') },
    ];
    if (user) {
      items.splice(1, 0, { name: 'Insights', href: createPageUrl('Insights') });
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
            <motion.div className="relative" whileHover={{ scale: 1.02 }}>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/60 px-3 py-1 shadow-sm dark:bg-slate-800/80"
              >
                <img src={user.avatar} alt={user.displayName} className="h-8 w-8 rounded-full object-cover" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user.displayName}</span>
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
                  className="text-xl font-semibold text-gray-300 hover:text-white transition-colors uppercase tracking-widest"
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
              className="relative h-full w-full max-w-sm bg-white text-slate-900 dark:bg-black dark:text-white shadow-2xl border-l border-slate-200 dark:border-white/10 p-6 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.displayName} className="h-12 w-12 rounded-full object-cover" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-white/60">Signed in</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{user.displayName}</p>
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
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{familyStatus.family.name}</p>
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
                      <p className="text-slate-600 dark:text-white/70">Members: {familyStatus.members?.length || 0}</p>
                      <p className="text-slate-600 dark:text-white/70">Role: {familyStatus.membership?.role || 'member'}</p>
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
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {familyStatus?.invite?.code || familyStatus?.family?.join_code || '—'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyInvite}
                          disabled={familyActionLoading || !(familyStatus?.invite?.code || familyStatus?.family?.join_code)}
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 disabled:opacity-60 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          Copy
                        </button>
                        <button
                          onClick={handleGenerateInvite}
                          disabled={familyActionLoading}
                          className="rounded-lg bg-emerald-500 text-black px-3 py-2 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-60"
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
                  className="flex items-center justify-between gap-2 w-full rounded-lg border border-red-500/40 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:border-red-400 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-100"
                >
                  <span>Logout</span>
                  <LogOut size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
