import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const membersCount = familyStatus.members?.length || 0;
  const invitesCount = familyStatus.invite ? 1 : 0;
  const familiesCount = familyStatus.family ? 1 : 0;
  const isJoining = familyActionMode === 'join';

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-10 font-playfair text-white"
      style={{
        backgroundImage: "url('/images/colorful-gradients-3840x2160-22838.jpg')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <AnimatedSection>
        <div className="relative max-w-3xl w-full mx-auto rounded-[36px] border border-white/20 bg-white/5 backdrop-blur-3xl shadow-[0_35px_120px_rgba(0,0,0,0.35)] overflow-hidden px-6 md:px-10 py-8 md:py-10 text-center">
          <div className="absolute inset-0 pointer-events-none bg-white/10" />
          <div className="relative flex flex-col items-center gap-6">
            <div className="relative h-32 w-32 rounded-full border-4 border-white/60 overflow-hidden shadow-2xl">
              {displayPhoto ? (
                <img src={displayPhoto} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-white/10">
                  <User className="text-white/80" size={48} />
                </div>
              )}
              <label className="absolute bottom-0 left-0 right-0 bg-white/85 text-emerald-800 text-xs font-semibold cursor-pointer py-1">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">{user?.displayName || 'Account'}</h1>
              <p className="text-base text-white/80 mt-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">{user?.email || '—'}</p>
            </div>

            <div className="grid grid-cols-3 w-full max-w-xl gap-4 text-center text-white">
              <div className="space-y-1">
                <div className="text-xl font-bold">{membersCount}</div>
                <div className="text-xs uppercase tracking-[0.15em]">Members</div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold">{invitesCount}</div>
                <div className="text-xs uppercase tracking-[0.15em]">Invites</div>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold">{familiesCount}</div>
                <div className="text-xs uppercase tracking-[0.15em]">Families</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xl">
              <button
                type="button"
                onClick={() => setFamilyActionMode('join')}
                className={`rounded-2xl border border-white/40 px-6 py-3 text-base font-semibold shadow-lg transition ${
                  isJoining ? 'bg-white/30 text-white' : 'bg-white/15 text-white/90 hover:bg-white/25'
                }`}
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setFamilyActionMode('create')}
                className={`rounded-2xl border border-white/40 px-6 py-3 text-base font-semibold shadow-lg transition ${
                  !isJoining ? 'bg-white/30 text-white' : 'bg-white/15 text-white/90 hover:bg-white/25'
                }`}
              >
                Create
              </button>
            </div>

            <div className="w-full max-w-2xl space-y-4">
              <input
                type="text"
                value={isJoining ? joinCodeInput : familyNameInput}
                onChange={(e) => (isJoining ? setJoinCodeInput(e.target.value) : setFamilyNameInput(e.target.value))}
                placeholder={isJoining ? 'Invite code' : 'Family name'}
                className="w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/60 shadow-inner shadow-black/30"
              />
              <button
                type="button"
                disabled={familyActionLoading}
                onClick={isJoining ? handleJoinFamily : handleCreateFamily}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-700 transition disabled:opacity-60"
              >
                {familyActionLoading ? (isJoining ? 'Joining…' : 'Creating…') : isJoining ? 'Join family' : 'Create family'}
              </button>
            </div>

            {familyActionMessage && (
              <div className="text-sm font-semibold text-white/90">{familyActionMessage}</div>
            )}

            {currentInviteCode && (
              <button
                type="button"
                onClick={handleCopyInvite}
                className="text-xs font-semibold text-white/90 underline underline-offset-4"
              >
                Copy invite code: {currentInviteCode}
              </button>
            )}

            {hasFamily && (
              <button
                type="button"
                onClick={handleLeaveFamily}
                disabled={familyActionLoading}
                className="mt-2 text-xs font-semibold text-white/80 underline underline-offset-4 disabled:opacity-60"
              >
                Leave family
              </button>
            )}
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
