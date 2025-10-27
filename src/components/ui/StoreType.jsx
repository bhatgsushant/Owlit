import React from 'react';
import { getStoreInfo } from '@/utils/logo';
import { Tag } from 'lucide-react';

const getCategoryColor = (category) => {
    const colorMap = {
        'Groceries - Supermarket': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'Fast Food': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'Bakery & Snacks': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Café & Coffee': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        'Café & Bakery': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
        'Fast Casual': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
        'Fashion & Clothing': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
        'Sportswear & Footwear': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Electronics & Appliances': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
        'Gaming & Entertainment': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        'Home & DIY': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
        'Books & Stationery': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
        'Pharmacy & Beauty': 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
        'Online Retail': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
        'Online Fashion': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
        'Fuel & Transport': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Transport & Ride Hailing': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        'Transport & Travel': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
        'Delivery & Food Apps': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'Pet Supplies': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'Department & Variety Stores': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Travel & Leisure': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
        'Convenience & Express Stores': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'Entertainment': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const StoreType = ({ merchantName }) => {
    const storeInfo = getStoreInfo(merchantName);
    const storeType = storeInfo ? storeInfo.StoreName_category : 'Other';
    const colorClass = getCategoryColor(storeType);

    return (
        <div className={`flex items-center justify-center text-xs font-medium px-2.5 py-0.5 rounded-full ${colorClass}`}>
            <Tag size={12} className="mr-1.5" />
            <span>{storeType}</span>
        </div>
    );
};

export default StoreType;
