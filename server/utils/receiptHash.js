const crypto = require('crypto');

function normalizeMerchantName(name = '') {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 -]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?:^|[\s])\w/g, c => c.toUpperCase());
}

function normalizeLineItemsForHash(lineItems = []) {
  return [...lineItems]
    .map((item = {}) => {
      const baseName = (item.item ?? item.name ?? item.Item_Name ?? '').toString();
      return {
        name: normalizeMerchantName(baseName),
        price: Number(item.price ?? item.Price ?? 0).toFixed(2),
        quantity: Number(item.quantity ?? item.Quantity ?? 1) || 1,
      };
    })
    .sort((a, b) => {
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      if (a.price !== b.price) return Number(a.price) - Number(b.price);
      return Number(a.quantity) - Number(b.quantity);
    });
}

function buildReceiptHash(userId, receiptData = {}) {
  const {
    merchant_name = '',
    transaction_date = '',
    total_amount = 0,
    line_items = [],
  } = receiptData;

  const normalizedDate = new Date(transaction_date).toISOString().split('T')[0];
  const payload = {
    userId,
    merchant: normalizeMerchantName(merchant_name),
    date: normalizedDate,
    total: Number(total_amount ?? 0).toFixed(2),
    items: normalizeLineItemsForHash(line_items),
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildLooseReceiptHash(userId, receiptData = {}) {
  const {
    merchant_name = '',
    transaction_date = '',
    total_amount = 0,
    line_items = [],
  } = receiptData;

  const normalizedDate = new Date(transaction_date).toISOString().split('T')[0];
  const normalizedTotal = Number(total_amount ?? 0).toFixed(2);

  // Extract item names only, normalize and sort (ignore price/quantity)
  const itemNames = [...line_items]
    .map(item => {
      const name = item.item || item.name || item.Item_Name || '';
      return normalizeMerchantName(name); // Reuse normalizeMerchantName for consistent cleaning
    })
    .filter(Boolean)
    .sort();

  const payload = {
    userId,
    merchant: normalizeMerchantName(merchant_name),
    date: normalizedDate,
    total: normalizedTotal,
    items: itemNames,
  };

  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

module.exports = {
  normalizeMerchantName,
  normalizeLineItemsForHash,
  buildReceiptHash,
  buildLooseReceiptHash,
};
