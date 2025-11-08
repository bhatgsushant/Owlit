import React, { useState, useEffect } from 'react';
import { getStoreInfo } from '@/utils/logo';
import { Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const MerchantLogo = ({ merchantName }) => {
  const [imgError, setImgError] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const { userStoreOverrides } = useAuth();

  useEffect(() => {
    const storeInfo = getStoreInfo(merchantName, userStoreOverrides);
    if (storeInfo && storeInfo.domain) {
      setLogoUrl(`https://logo.clearbit.com/${storeInfo.domain}`);
    }
    setImgError(false);
  }, [merchantName, userStoreOverrides]);

  if (imgError || !logoUrl) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-md border-2 border-white">
        <Store className="w-5 h-5 text-gray-500" />
      </div>
    );
  }
  
  return (
    <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md border border-gray-200/50 overflow-hidden">
      <img 
        src={logoUrl} 
        alt={`${merchantName} logo`}
        className="w-full h-full object-contain"
        onError={() => setImgError(true)} 
      />
    </div>
  );
};

export default MerchantLogo;