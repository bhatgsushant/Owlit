import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeLogin } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const redirectPath = searchParams.get('redirect') || '/scan';

    if (token) {
      completeLogin(token);
      navigate(redirectPath, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [completeLogin, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold">Signing you in…</p>
        <p className="text-sm text-slate-400">Please wait while we finish connecting your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
