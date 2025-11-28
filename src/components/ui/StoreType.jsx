import React from 'react';
import { getStoreInfo } from '@/utils/logo';
import { Tag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const getCategoryColor = (category) => {
    const colorMap = {
        'Groceries - Supermarket': 'text-green-300',
        'Fast Food': 'text-red-300',
        'Bakery & Snacks': 'text-yellow-300',
        'Café & Coffee': 'text-amber-300',
        'Café & Bakery': 'text-amber-300',
        'Fast Casual': 'text-orange-300',
        'Fashion & Clothing': 'text-pink-300',
        'Sportswear & Footwear': 'text-blue-300',
        'Electronics & Appliances': 'text-indigo-300',
        'Gaming & Entertainment': 'text-purple-300',
        'Home & DIY': 'text-cyan-300',
        'Books & Stationery': 'text-lime-300',
        'Pharmacy & Beauty': 'text-fuchsia-300',
        'Online Retail': 'text-sky-300',
        'Online Fashion': 'text-rose-300',
        'Fuel & Transport': 'text-gray-300',
        'Transport & Ride Hailing': 'text-slate-300',
        'Transport & Travel': 'text-teal-300',
        'Delivery & Food Apps': 'text-blue-300',
        'Pet Supplies': 'text-yellow-300',
        'Department & Variety Stores': 'text-gray-300',
        'Travel & Leisure': 'text-emerald-300',
        'Convenience & Express Stores': 'text-gray-300',
        'Entertainment': 'text-violet-300',
    };
    return colorMap[category] || 'text-gray-300';
};

const StoreType = ({ merchantName, storeType: propStoreType }) => {
    const { userStoreOverrides } = useAuth();
    let storeType = propStoreType;
    if (!storeType) {
      const storeInfo = getStoreInfo(merchantName, userStoreOverrides);
      storeType = storeInfo ? storeInfo.StoreName_category : 'Other';
    }
    const colorClass = getCategoryColor(storeType);

    return (
        <div className={`flex items-center justify-start text-xs font-medium ${colorClass}`}>
            <Tag size={12} className="mr-1.5" />
            <span>{storeType}</span>
        </div>
    );
};

export default StoreType;
