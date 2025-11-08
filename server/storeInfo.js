// server/storeInfo.js

module.exports.getStoreInfo = function(merchantName = '') {
  const name = merchantName.toLowerCase();

  // ✅ Add more stores here as needed
  if (name.includes('tesco')) {
    return { StoreName_category: 'Supermarket', logo: 'tesco' };
  }

  if (name.includes('asda')) {
    return { StoreName_category: 'Supermarket', logo: 'asda' };
  }

  if (name.includes('aldi')) {
    return { StoreName_category: 'Supermarket', logo: 'aldi' };
  }

  // Default fallback
  return { StoreName_category: 'Other', logo: null };
};
