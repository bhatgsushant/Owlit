const {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subDays,
  startOfYear,
  endOfYear,
} = require('date-fns');

const DEFAULT_CURRENCY_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const WEEK_OPTIONS = { weekStartsOn: 1 };
const FOLLOW_UPS = {
  total_spend: [
    'Would you like to compare this to last month?',
    'Want a breakdown by merchant or category?',
  ],
  item_spend: [
    'Should I show which stores sold those items?',
    'Compare this item spend to the previous month?',
  ],
  top_merchants: [
    'Do you want to see the actual receipts for these merchants?',
    'Should I group this by category instead?',
  ],
  list_receipts: [
    'Need a CSV export of these receipts?',
    'Want to see the total spend for this same period?',
  ],
  fallback: [
    'Try broadening the time range.',
    'Ask for the top merchants this quarter.',
  ],
};

const sanitizeTermList = (list = []) =>
  (Array.isArray(list) ? list : [])
    .map((value) => (value ?? '').toString().trim())
    .filter(Boolean);

const toLowerTerms = (list = []) => sanitizeTermList(list).map((term) => term.toLowerCase());

const formatCurrency = (value = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_CURRENCY_FORMATTER.format(0);
  return DEFAULT_CURRENCY_FORMATTER.format(numericValue);
};

const formatDateForSpeech = (value) => {
  if (!value) return '';
  try {
    return format(new Date(value), 'd MMM yyyy');
  } catch {
    return value;
  }
};

const describeDateRange = (range = {}) => {
  if (range.start && range.end) {
    return `between ${formatDateForSpeech(range.start)} and ${formatDateForSpeech(range.end)}`;
  }
  if (range.start) {
    return `since ${formatDateForSpeech(range.start)}`;
  }
  if (range.end) {
    return `up to ${formatDateForSpeech(range.end)}`;
  }
  return 'across all time';
};

const listToSpeech = (list = []) => {
  const unique = [...new Set(list)];
  if (!unique.length) return '';
  if (unique.length === 1) return `'${unique[0]}'`;
  if (unique.length === 2) return `'${unique[0]}' and '${unique[1]}'`;
  return `${unique
    .slice(0, -1)
    .map((item) => `'${item}'`)
    .join(', ')}, and '${unique.at(-1)}'`;
};

const resolveAiDateRange = (range = {}) => {
  const preset = (range.preset || 'all_time').toLowerCase();
  let start = null;
  let end = null;
  const today = new Date();

  switch (preset) {
    case 'this_month':
      start = startOfMonth(today);
      end = endOfMonth(today);
      break;
    case 'last_month': {
      const lastMonth = subMonths(today, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    }
    case 'this_week':
      start = startOfWeek(today, WEEK_OPTIONS);
      end = endOfWeek(today, WEEK_OPTIONS);
      break;
    case 'last_week': {
      const priorWeek = subWeeks(today, 1);
      start = startOfWeek(priorWeek, WEEK_OPTIONS);
      end = endOfWeek(priorWeek, WEEK_OPTIONS);
      break;
    }
    case 'last_7_days':
      start = subDays(today, 6);
      end = today;
      break;
    case 'last_30_days':
      start = subDays(today, 29);
      end = today;
      break;
    case 'this_year':
      start = startOfYear(today);
      end = endOfYear(today);
      break;
    case 'custom':
      if (range.start) start = new Date(range.start);
      if (range.end) end = new Date(range.end);
      break;
    case 'all_time':
    default:
      break;
  }

  const normalizedStart = start ? format(start, 'yyyy-MM-dd') : null;
  const normalizedEnd = end ? format(end, 'yyyy-MM-dd') : null;

  return {
    preset,
    start: normalizedStart,
    end: normalizedEnd,
  };
};

const safeLineItems = (lineItems) => {
  if (Array.isArray(lineItems)) return lineItems;
  if (!lineItems) return [];
  if (typeof lineItems === 'string') {
    try {
      const parsed = JSON.parse(lineItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeLineItems = (lineItems = []) =>
  safeLineItems(lineItems).map((item = {}) => {
    const price = Number(item.price ?? item.Price ?? item.unit_price ?? 0) || 0;
    const quantity = Number(item.quantity ?? item.Quantity ?? 1) || 1;
    const total = price * quantity;
    return {
      name: (item.name ?? item.item ?? item.Item_Name ?? '').toString().trim(),
      main_category: (item.main_category ?? item.category ?? '').toString().toLowerCase(),
      sub_category: (item.sub_category ?? item.Sub_Category ?? item.category_detail ?? '').toString().toLowerCase(),
      price,
      quantity,
      total,
    };
  });

const matchesAnyTerm = (value, terms = []) => {
  if (!terms.length) return true;
  const target = (value ?? '').toString().toLowerCase();
  return terms.some((term) => target.includes(term));
};

const filterItemsByTerms = (items = [], { itemTerms = [], categoryTerms = [] }) => {
  const hasItemTerms = itemTerms.length > 0;
  const hasCategoryTerms = categoryTerms.length > 0;
  if (!hasItemTerms && !hasCategoryTerms) {
    return items;
  }
  return items.filter((item) => {
    const nameMatches = hasItemTerms ? matchesAnyTerm(item.name, itemTerms) : false;
    const categoryMatches = hasCategoryTerms
      ? categoryTerms.includes(item.main_category) || categoryTerms.includes(item.sub_category)
      : false;
    return nameMatches || categoryMatches;
  });
};

const normalizeOperator = (operator = '') => {
  const value = operator.toLowerCase();
  if (['>', '>=', '<', '<=', '='].includes(value)) return value;
  switch (value) {
    case 'gt':
    case 'greater_than':
      return '>';
    case 'gte':
    case 'greater_or_equal':
      return '>=';
    case 'lt':
    case 'less_than':
      return '<';
    case 'lte':
    case 'less_or_equal':
      return '<=';
    case 'eq':
    case 'equals':
      return '=';
    default:
      return null;
  }
};

const normalizeAmountFilter = (filter) => {
  if (!filter || filter.value === undefined || filter.value === null) {
    return null;
  }
  const normalizedValue = Number(filter.value);
  if (!Number.isFinite(normalizedValue)) return null;
  const operator = normalizeOperator(filter.operator || '');
  if (!operator) return null;
  return {
    operator,
    value: normalizedValue,
  };
};

const compareAmount = (value, filter) => {
  if (!filter) return true;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return false;
  switch (filter.operator) {
    case '>':
      return numericValue > filter.value;
    case '>=':
      return numericValue >= filter.value;
    case '<':
      return numericValue < filter.value;
    case '<=':
      return numericValue <= filter.value;
    case '=':
      return numericValue === filter.value;
    default:
      return true;
  }
};

const escapeSqlLiteral = (value = '') => value.replace(/'/g, "''");

const buildSqlPreview = (filters, dateRange, useLineItems) => {
  const whereClauses = ["r.user_id = '[CURRENT_USER_ID]'"];
  if (dateRange.start) {
    whereClauses.push(`r.transaction_date >= '${escapeSqlLiteral(dateRange.start)}'`);
  }
  if (dateRange.end) {
    whereClauses.push(`r.transaction_date <= '${escapeSqlLiteral(dateRange.end)}'`);
  }
  (filters.merchantTerms || []).forEach((term) => {
    whereClauses.push(`LOWER(r.merchant_name) LIKE '%${escapeSqlLiteral(term)}%'`);
  });
  if (filters.amountFilter) {
    whereClauses.push(`r.total_amount ${filters.amountFilter.operator} ${filters.amountFilter.value}`);
  }
  if (useLineItems) {
    const lineClauses = [];
    (filters.itemTerms || []).forEach((term) => {
      lineClauses.push(`LOWER(li.item_name) LIKE '%${escapeSqlLiteral(term)}%'`);
    });
    (filters.categoryTerms || []).forEach((term) => {
      lineClauses.push(
        `(LOWER(li.main_category) = '${escapeSqlLiteral(term)}' OR LOWER(li.sub_category) = '${escapeSqlLiteral(term)}')`
      );
    });
    if (lineClauses.length) {
      whereClauses.push(`(${lineClauses.join(' OR ')})`);
    }
  }
  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const baseQuery = useLineItems
    ? `SELECT r.id,
             r.transaction_date,
             r.merchant_name,
             li.item_name,
             li.price,
             li.quantity,
             (li.price * COALESCE(li.quantity, 1)) AS line_total
        FROM receipts r
        CROSS JOIN LATERAL jsonb_to_recordset(r.line_items)
          AS li(item_name text, price numeric, quantity numeric, main_category text, sub_category text)
        ${whereSql}`
    : `SELECT r.id,
             r.transaction_date,
             r.merchant_name,
             r.total_amount
        FROM receipts r
        ${whereSql}`;
  return `${baseQuery};`;
};

const sumLineItems = (items = []) => items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

const describeAppliedFilters = ({ merchantTermsOriginal, itemTermsOriginal, categoryTermsOriginal, amountFilter }) => {
  const descriptors = [];
  if (merchantTermsOriginal.length) {
    descriptors.push(`for merchants matching ${listToSpeech(merchantTermsOriginal)}`);
  }
  if (itemTermsOriginal.length) {
    descriptors.push(`that mention ${listToSpeech(itemTermsOriginal)}`);
  }
  if (categoryTermsOriginal.length) {
    descriptors.push(`categorised as ${listToSpeech(categoryTermsOriginal)}`);
  }
  if (amountFilter) {
    descriptors.push(`${amountFilter.operator} ${formatCurrency(amountFilter.value)}`);
  }
  return descriptors.join(' and ');
};

const buildFollowUps = (operation) => FOLLOW_UPS[operation] || FOLLOW_UPS.fallback;

const analyzeSpendingResults = ({ receipts = [], interpretation = {}, dateRange }) => {
  const operation = interpretation.operation || 'total_spend';
  const merchantTermsOriginal = sanitizeTermList(interpretation.merchant_terms);
  const itemTermsOriginal = sanitizeTermList(interpretation.item_terms);
  const categoryTermsOriginal = sanitizeTermList(interpretation.category_terms);
  const merchantTerms = toLowerTerms(merchantTermsOriginal);
  const itemTerms = toLowerTerms(itemTermsOriginal);
  const categoryTerms = toLowerTerms(categoryTermsOriginal);
  const amountFilter = normalizeAmountFilter(interpretation.amount_filter);
  const useLineItems = Boolean(itemTerms.length || categoryTerms.length || operation === 'item_spend');

  const normalizedReceipts = receipts.map((receipt) => {
    const normalizedItems = normalizeLineItems(receipt.line_items);
    return {
      ...receipt,
      merchant_name: (receipt.merchant_name || 'Unknown merchant').trim(),
      total_amount: Number(receipt.total_amount) || 0,
      normalizedItems,
    };
  });

  let filteredReceipts = merchantTerms.length
    ? normalizedReceipts.filter((receipt) => matchesAnyTerm(receipt.merchant_name, merchantTerms))
    : normalizedReceipts;

  filteredReceipts = filteredReceipts
    .map((receipt) => {
      const matchedItems = useLineItems
        ? filterItemsByTerms(receipt.normalizedItems, { itemTerms, categoryTerms })
        : receipt.normalizedItems;
      return { ...receipt, matchedItems };
    })
    .filter((receipt) => (useLineItems ? receipt.matchedItems.length > 0 : true));

  if (amountFilter) {
    filteredReceipts = filteredReceipts.filter((receipt) => {
      const value = useLineItems ? sumLineItems(receipt.matchedItems) : receipt.total_amount;
      return compareAmount(value, amountFilter);
    });
  }

  const sql_query = buildSqlPreview(
    {
      merchantTerms,
      itemTerms,
      categoryTerms,
      amountFilter,
    },
    dateRange,
    useLineItems
  );

  if (!filteredReceipts.length) {
    const rangeSpeech = describeDateRange(dateRange);
    const filterSpeech = describeAppliedFilters({
      merchantTermsOriginal,
      itemTermsOriginal,
      categoryTermsOriginal,
      amountFilter,
    });
    const descriptor = [filterSpeech, rangeSpeech].filter(Boolean).join(' ');
    return {
      sql_query,
      final_answer: `I couldn't find any receipts ${descriptor || 'matching your filters'}. Try broadening the scope or adjusting the keywords.`,
      follow_ups: FOLLOW_UPS.fallback,
    };
  }

  const totalLineItems = filteredReceipts.reduce((sum, receipt) => sum + receipt.matchedItems.length, 0);
  const dateSpeech = describeDateRange(dateRange);
  const filterSpeech = describeAppliedFilters({
    merchantTermsOriginal,
    itemTermsOriginal,
    categoryTermsOriginal,
    amountFilter,
  });
  const contextDescriptor = [filterSpeech, dateSpeech].filter(Boolean).join(' ');

  const summarizeTopMerchants = () => {
    const merchantTotals = {};
    filteredReceipts.forEach((receipt) => {
      const contribution = useLineItems ? sumLineItems(receipt.matchedItems) : receipt.total_amount;
      if (contribution <= 0) return;
      merchantTotals[receipt.merchant_name] = (merchantTotals[receipt.merchant_name] || 0) + contribution;
    });
    const sorted = Object.entries(merchantTotals)
      .map(([merchant, value]) => ({ merchant, value }))
      .sort((a, b) => b.value - a.value);
    const leaderList = sorted.slice(0, 3).map(
      ({ merchant, value }) => `${merchant} (${formatCurrency(value)})`
    );
    const answer = leaderList.length
      ? `Your top merchants ${contextDescriptor ? contextDescriptor : ''} were ${leaderList.join(', ')}.`
      : `I couldn't identify distinct merchants ${contextDescriptor}.`;
    return {
      final_answer: answer.trim(),
      follow_ups: buildFollowUps('top_merchants'),
    };
  };

  const summarizeTotals = (isItemFocused = false) => {
    const totalValue = filteredReceipts.reduce((sum, receipt) => {
      if (useLineItems) {
        return sum + sumLineItems(receipt.matchedItems);
      }
      return sum + receipt.total_amount;
    }, 0);
    const receiptCount = filteredReceipts.length;
    const baseLabel = isItemFocused || useLineItems ? 'item spend' : 'total spend';
    const answerParts = [
      `Your ${baseLabel} ${contextDescriptor ? contextDescriptor : ''} is ${formatCurrency(totalValue)}.`,
      `That spans ${receiptCount} receipt${receiptCount === 1 ? '' : 's'}`,
    ];
    if (useLineItems) {
      answerParts.push(`covering ${totalLineItems} line item${totalLineItems === 1 ? '' : 's'}.`);
    }
    return {
      final_answer: answerParts.join(' ').trim(),
      follow_ups: buildFollowUps(isItemFocused ? 'item_spend' : 'total_spend'),
    };
  };

  const summarizeReceipts = () => {
    const MAX_ROWS = 5;
    const rows = filteredReceipts.slice(0, MAX_ROWS).map((receipt) => {
      const amount = useLineItems ? sumLineItems(receipt.matchedItems) : receipt.total_amount;
      const itemSummary =
        useLineItems && receipt.matchedItems.length
          ? ` — ${receipt.matchedItems
              .map((item) => item.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(', ')}`
          : '';
      return `• ${formatDateForSpeech(receipt.transaction_date)} — ${receipt.merchant_name} (${formatCurrency(
        amount
      )}${itemSummary})`;
    });
    const moreCount = filteredReceipts.length - rows.length;
    const footer = moreCount > 0 ? `...and ${moreCount} more receipt${moreCount === 1 ? '' : 's'}.` : '';
    return {
      final_answer: `${rows.join('\n')}${footer ? `\n${footer}` : ''}`,
      follow_ups: buildFollowUps('list_receipts'),
    };
  };

  switch (operation) {
    case 'top_merchants':
      return { sql_query, ...summarizeTopMerchants() };
    case 'list_receipts':
      return { sql_query, ...summarizeReceipts() };
    case 'item_spend':
      return { sql_query, ...summarizeTotals(true) };
    case 'total_spend':
    default:
      return { sql_query, ...summarizeTotals(false) };
  }
};

module.exports = {
  resolveAiDateRange,
  analyzeSpendingResults,
  sanitizeTermList,
};
