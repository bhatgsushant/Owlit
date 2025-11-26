import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { useAuth } from '@/context/AuthContext';

const readErrorMessage = async (response) => {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error) return parsed.error;
  } catch {
    // ignore parse errors
  }
  return text || 'Request failed';
};

export default function Profile() {
  const { user, fetchWithAuth, loading } = useAuth();
  const [familyStatus, setFamilyStatus] = useState({ family: null, members: [], invite: null, membership: null });
  const [familyStatusLoading, setFamilyStatusLoading] = useState(false);
  const [familyActionLoading, setFamilyActionLoading] = useState(false);
  const [familyActionMessage, setFamilyActionMessage] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [familyNameInput, setFamilyNameInput] = useState('');
  const [familyActionMode, setFamilyActionMode] = useState('create'); // 'create' | 'join'
  const hasFamily = Boolean(familyStatus.family);

  const currentInviteCode = useMemo(
    () => familyStatus?.invite?.code || familyStatus?.family?.join_code || '',
    [familyStatus]
  );

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
    } finally {
      setFamilyStatusLoading(false);
    }
  }, [fetchWithAuth, user]);

  useEffect(() => {
    if (!loading) {
      fetchFamilyStatus();
    }
  }, [loading, fetchFamilyStatus]);

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
    if (!currentInviteCode) return;
    try {
      await navigator.clipboard.writeText(currentInviteCode);
      setFamilyActionMessage('Invite code copied.');
    } catch (err) {
      console.error(err);
      setFamilyActionMessage('Unable to copy invite code.');
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-white text-slate-900 dark:bg-black dark:text-white font-playfair">
      <AnimatedSection>
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Profile</h1>
          <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Manage your account and family sharing.</p>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.05}>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-2 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Account</p>
            <p className="text-lg font-semibold text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{user?.displayName || '—'}</p>
            <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{user?.email || '—'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50 mb-2 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Family status</p>
            {familyStatusLoading ? (
              <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Loading family info…</p>
            ) : familyStatus.family ? (
              <>
                <p className="text-lg font-semibold text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{familyStatus.family.name}</p>
                <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Members: {familyStatus.members?.length || 0}</p>
                <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Role: {familyStatus.membership?.role || 'member'}</p>
              </>
            ) : (
              <p className="text-sm text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Not in a family yet.</p>
            )}
          </div>
        </div>
      </AnimatedSection>

      {!hasFamily && (
        <AnimatedSection delay={0.08}>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 p-1">
              <button
                onClick={() => setFamilyActionMode('create')}
                className={`px-4 py-1 text-xs font-semibold rounded-full transition font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] ${
                  familyActionMode === 'create' ? 'bg-white text-black' : 'text-white/80 hover:text-white'
                }`}
              >
                Create a family
              </button>
              <button
                onClick={() => setFamilyActionMode('join')}
                className={`px-4 py-1 text-xs font-semibold rounded-full transition font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] ${
                  familyActionMode === 'join' ? 'bg-white text-black' : 'text-white/80 hover:text-white'
                }`}
              >
                Join a family
              </button>
            </div>

            {familyActionMode === 'create' ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Create a family</p>
                <input
                  type="text"
                  placeholder="Family name"
                  value={familyNameInput}
                  onChange={(e) => setFamilyNameInput(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
                <button
                  onClick={handleCreateFamily}
                  disabled={familyActionLoading || !familyNameInput.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-500 text-sm font-semibold text-black shadow hover:bg-emerald-400 disabled:opacity-60 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]"
                >
                  {familyActionLoading ? 'Creating…' : 'Create family'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Join a family</p>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
                <button
                  onClick={handleJoinFamily}
                  disabled={familyActionLoading || !joinCodeInput.trim()}
                  className="w-full px-4 py-2 rounded-lg bg-white text-sm font-semibold text-black shadow hover:bg-white/90 disabled:opacity-60 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]"
                >
                  {familyActionLoading ? 'Joining…' : 'Join family'}
                </button>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {hasFamily && (
        <AnimatedSection delay={0.1}>
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Invite code</p>
                <p className="text-lg font-semibold text-white font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{currentInviteCode || '—'}</p>
                <p className="text-xs text-white/60 mt-1 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                  Share this code with family members. They must leave their current family before joining.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopyInvite}
                  disabled={!currentInviteCode}
                  className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]"
                >
                  Copy code
                </button>
                <button
                  onClick={handleGenerateInvite}
                  disabled={familyActionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 disabled:opacity-60 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]"
                >
                  {familyActionLoading ? 'Generating…' : 'New code'}
                </button>
                <button
                  onClick={handleLeaveFamily}
                  disabled={familyActionLoading}
                  className="px-4 py-2 rounded-lg border border-red-400/60 text-sm font-semibold text-red-100 hover:bg-red-500/10 disabled:opacity-60 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]"
                >
                  Leave family
                </button>
              </div>
            </div>
            <p className="text-xs text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
              {familyStatusLoading
                ? 'Refreshing family status…'
                : familyStatus.family
                ? `Family ID: ${familyStatus.family.id}`
                : 'Create or join to get an invite code.'}
            </p>
            {familyActionMessage && <p className="text-xs text-white/70 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{familyActionMessage}</p>}
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}
