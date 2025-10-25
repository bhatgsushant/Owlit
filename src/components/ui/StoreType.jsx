import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStoreInfo } from '@/utils/logo';

const categoryColors = {
    'Groceries - Supermarket': "bg-green-100 text-green-800",
    'Fast Food': "bg-red-100 text-red-800",
    'Bakery & Snacks': "bg-yellow-100 text-yellow-800",
    'Café & Coffee': "bg-amber-100 text-amber-800",
    'Café & Bakery': "bg-orange-100 text-orange-800",
    'Fast Casual': "bg-red-100 text-red-800",
    'Fashion & Clothing': "bg-purple-100 text-purple-800",
    'Sportswear & Footwear': "bg-blue-100 text-blue-800",
    'Electronics & Appliances': "bg-indigo-100 text-indigo-800",
    'Gaming & Entertainment': "bg-gray-100 text-gray-800",
    'Home & DIY': "bg-lime-100 text-lime-800",
    'Books & Stationery': "bg-cyan-100 text-cyan-800",
    'Pharmacy & Beauty': "bg-pink-100 text-pink-800",
    'Online Retail': "bg-sky-100 text-sky-800",
    'Online Fashion': "bg-violet-100 text-violet-800",
    'Fuel & Transport': "bg-stone-100 text-stone-800",
    'Transport & Ride Hailing': "bg-slate-100 text-slate-800",
    'Transport & Travel': "bg-neutral-100 text-neutral-800",
    'Delivery & Food Apps': "bg-rose-100 text-rose-800",
    'Pet Supplies': "bg-teal-100 text-teal-800",
    'Department & Variety Stores': "bg-fuchsia-100 text-fuchsia-800",
    'Travel & Leisure': "bg-emerald-100 text-emerald-800",
    'Convenience & Express Stores': "bg-light-blue-100 text-light-blue-800",
    'Entertainment': "bg-yellow-100 text-yellow-800",
    'Other': "bg-gray-100 text-gray-800"
};

const StoreType = ({ merchantName }) => {
  const storeInfo = getStoreInfo(merchantName);
  const category = storeInfo ? storeInfo.StoreName_category : 'Other';
  const color = categoryColors[category] || categoryColors.Other;

  return (
    <Badge className={`${color} text-xs font-medium`}>{category}</Badge>
  );
};

export default StoreType;