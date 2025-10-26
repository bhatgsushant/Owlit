import React from 'react';
import { getStoreInfo } from '@/utils/logo';
import { Tag } from 'lucide-react';

const StoreType = ({ merchantName }) => {
    const storeInfo = getStoreInfo(merchantName);
    const storeType = storeInfo ? storeInfo.StoreName_category : 'Other';

    return (
        <div className="flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
            <Tag size={12} className="mr-1.5" />
            <span>{storeType}</span>
        </div>
    );
};

export default StoreType;
