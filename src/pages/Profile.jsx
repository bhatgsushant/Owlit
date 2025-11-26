import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { useAuth } from '@/context/AuthContext';
import { User } from 'lucide-react';

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
  const [familyActionMode, setFamilyActionMode] = useState('create');
  const hasFamily = Boolean(familyStatus.family);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(url);
  };

  const displayPhoto = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (user?.avatar) return user.avatar;
    return null;
  }, [photoPreview, user?.avatar]);

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
      setFamilyActionMessage('Unable to load family status right now.');
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
    <div
      className="px-4 md:px-6 lg:px-8 py-4 min-h-screen text-white font-playfair flex justify-center items-start"
      style={{
        backgroundImage: "url('/images/colorful-gradients-3840x2160-22838.jpg')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-3xl flex justify-center">
        <AnimatedSection delay={0.05}>
          <div
            className="relative w-full max-w-sm min-h-[520px] rounded-[22px] shadow-2xl shadow-black/30 p-6 md:p-8 flex flex-col gap-6 items-center text-center"
            style={{
              backgroundColor: 'rgba(148,148,148,0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          >
            <div className="flex flex-col gap-3 items-center">
              <div className="relative h-28 w-28 rounded-full border-2 border-white bg-white/10 overflow-hidden flex items-center justify-center shadow-lg shadow-black/20">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="text-white" size={40} />
                )}
                <label className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold text-emerald-900 bg-emerald-100/90 cursor-pointer px-2 py-1">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <div>
                <p className="text-xl font-bold text-white font-semibold">{user?.displayName || '—'}</p>
                <p className="text-sm text-white/90 font-semibold">{user?.email || '—'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-white w-full">
              <div>
                <p className="text-lg font-bold">{familyStatus.members?.length ?? 0}</p>
                <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Members</p>
              </div>
              <div>
                <p className="text-lg font-bold">{familyStatus.invite?.code ? 1 : 0}</p>
                <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Invites</p>
              </div>
              <div>
                <p className="text-lg font-bold">{familyStatus.family ? 1 : 0}</p>
                <p className="text-xs uppercase tracking-wide text-white/80 font-semibold">Families</p>
              </div>
            </div>

            <div className="flex gap-3 w-full justify-center">
              <button
                onClick={() => setFamilyActionMode('join')}
                className="flex-1 rounded-xl border border-white/50 bg-white/20 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/30 transition"
              >
                Join
              </button>
              <button
                onClick={() => setFamilyActionMode('create')}
                className="flex-1 rounded-xl border border-white/50 bg-transparent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-white/10 transition"
              >
                Create
              </button>
            </div>

            {familyActionMode === 'create' ? (
              <div className="w-full space-y-2 text-sm">
                <input
                  type="text"
                  placeholder="Family name"
                  value={familyNameInput}
                  onChange={(e) => setFamilyNameInput(e.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/70"
                />
                <button
                  onClick={handleCreateFamily}
                  disabled={familyActionLoading || !familyNameInput.trim()}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-400 disabled:opacity-60"
                >
                  {familyActionLoading ? 'Creating…' : 'Create family'}
                </button>
              </div>
            ) : (
              <div className="w-full space-y-2 text-sm">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 placeholder:text-white/70"
                />
                <button
                  onClick={handleJoinFamily}
                  disabled={familyActionLoading || !joinCodeInput.trim()}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-400 disabled:opacity-60"
                >
                  {familyActionLoading ? 'Joining…' : 'Join family'}
                </button>
              </div>
            )}

            {hasFamily && (
              <div className="w-full space-y-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-white/80">Invite code</p>
                <p className="text-sm text-white">{currentInviteCode || '—'}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyInvite}
                    disabled={!currentInviteCode}
                    className="flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={familyActionLoading}
                    className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {familyActionLoading ? 'New…' : 'New code'}
                  </button>
                  <button
                    onClick={handleLeaveFamily}
                    disabled={familyActionLoading}
                    className="flex-1 rounded-lg border border-red-300 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-60"
                  >
                    Leave
                  </button>
                </div>
                <p className="text-xs text-white">
                  {familyStatusLoading
                    ? 'Refreshing family status…'
                    : familyStatus.family
                    ? `Family ID: ${familyStatus.family.id}`
                    : 'Create or join to get an invite code.'}
                </p>
                {familyActionMessage && <p className="text-xs text-white">{familyActionMessage}</p>}
              </div>
            )}
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
