import React, { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import {
  format,
  parse,
  startOfYear,
  startOfMonth,
  startOfWeek,
  startOfDay,
  subYears,
  subMonths,
  subWeeks,
  subDays,
} from 'date-fns';

const weekDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const roundToTwo = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const formatCurrency = (value) =>
  `£${Number(value || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDisplayDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!(parsed instanceof Date) || Number.isNaN(parsed)) {
    return value;
  }
  return format(parsed, 'dd MMM yyyy');
};

const ChartCard = ({
  title,
  description,
  option,
  isLoading,
  hasData,
  height = 320,
  onEvents,
  emptyMessage,
  headerAction,
}) => {
  const canRenderChart = Boolean(option) && hasData;

  return (
    <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl backdrop-blur-md">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg md:text-xl font-semibold text-white font-display">{title}</h2>
          {headerAction}
        </div>
        {description && (
          <p className="text-sm text-gray-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <div className="w-full h-full rounded-2xl bg-gray-800/40 animate-pulse" />
        ) : canRenderChart ? (
          <ReactECharts option={option} style={{ height }} notMerge lazyUpdate onEvents={onEvents} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 text-center px-4">
            {emptyMessage || 'No data available yet. Scan a receipt to unlock insights.'}
          </div>
        )}
      </div>
    </div>
  );
};

const StatsCard = ({ label, value, helper }) => (
  <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-4 md:p-6 flex flex-col gap-2 shadow-xl backdrop-blur md:min-h-[140px]">
    <span className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">{label}</span>
    <span className="text-2xl md:text-3xl font-bold text-white font-display">{value}</span>
    {helper && <span className="text-xs text-gray-400 leading-relaxed">{helper}</span>}
  </div>
);

const TimeframeCard = ({ label, current, previous }) => {
  const delta =
    previous === 0
      ? current > 0
        ? Infinity
        : 0
      : ((current - previous) / previous) * 100;

  let deltaLabel = '—';
  if (delta === Infinity) {
    deltaLabel = 'New';
  } else if (delta !== 0) {
    deltaLabel = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
  }

  const deltaClass =
    delta === 0
      ? 'text-gray-400'
      : delta === Infinity
      ? 'text-emerald-300'
      : delta > 0
      ? 'text-emerald-300'
      : 'text-rose-300';

  return (
    <div className="bg-black/30 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md flex flex-col gap-2 shadow-xl">
      <span className="text-xs uppercase tracking-[0.32em] text-gray-400 font-semibold">{label}</span>
      <span className="text-xl md:text-2xl font-semibold text-white font-display">{formatCurrency(current)}</span>
      <span className={`text-xs font-medium ${deltaClass}`}>
        {deltaLabel}{' '}
        <span className="text-gray-500">
          {delta === 0 ? '' : 'vs previous'}
        </span>
      </span>
      {previous > 0 && (
        <span className="text-[11px] text-gray-500">
          Previous: {formatCurrency(previous)}
        </span>
      )}
    </div>
  );
};

export default function Insights() {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [drillLevel, setDrillLevel] = useState('main');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [selectedMerchantCategory, setSelectedMerchantCategory] = useState(null);
  const [selectedMerchantSubcategory, setSelectedMerchantSubcategory] = useState(null);
  const [merchantDrillLevel, setMerchantDrillLevel] = useState('merchant');

  useEffect(() => {
    let isMounted = true;

    const fetchReceipts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/receipts', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Unable to fetch receipts');
        }
        const data = await response.json();
        if (isMounted) {
          setReceipts(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setError(err.message || 'Unexpected error while loading data');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchReceipts();
    return () => {
      isMounted = false;
    };
  }, []);

  const processedReceipts = useMemo(() => {
    if (!receipts.length) return [];

    return receipts.map((receipt) => {
      const items = Array.isArray(receipt.line_items) ? receipt.line_items : [];
      const itemsTotal = items.reduce((sum, item) => {
        const price = Number(item.price ?? item.Price ?? 0);
        const quantityRaw = item.quantity ?? item.Quantity ?? 1;
        const quantity = Number(quantityRaw);
        const multiplier = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        return sum + price * multiplier;
      }, 0);

      const parsedDate = receipt.transaction_date ? new Date(receipt.transaction_date) : null;
      const isValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate);

      return {
        ...receipt,
        line_items: items,
        total_amount: Number(receipt.total_amount) > 0 ? Number(receipt.total_amount) : itemsTotal,
        dateObj: isValidDate ? parsedDate : null,
        itemsTotal,
      };
    });
  }, [receipts]);

  const analytics = useMemo(() => {
    const now = new Date();
    const currentYearStart = startOfYear(now);
    const previousYearStart = startOfYear(subYears(now, 1));
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const currentDayStart = startOfDay(now);
    const previousDayStart = startOfDay(subDays(now, 1));

    const currentYearStartTime = currentYearStart.getTime();
    const previousYearStartTime = previousYearStart.getTime();
    const currentMonthStartTime = currentMonthStart.getTime();
    const previousMonthStartTime = previousMonthStart.getTime();
    const currentWeekStartTime = currentWeekStart.getTime();
    const previousWeekStartTime = previousWeekStart.getTime();
    const currentDayStartTime = currentDayStart.getTime();
    const previousDayStartTime = previousDayStart.getTime();

    const timeframeTotals = {
      year: { current: 0, previous: 0 },
      month: { current: 0, previous: 0 },
      week: { current: 0, previous: 0 },
      day: { current: 0, previous: 0 },
    };

    if (!processedReceipts.length) {
      return {
        monthlySeries: [],
        categoryHierarchy: [],
        merchantSeries: [],
        merchantDrilldown: { merchants: [], details: {} },
        weekdaySeries: [],
        categoryTimeline: null,
        categoryDetails: {},
        categoryNames: [],
        itemTotals: [],
        stats: null,
        timeframeInsights: timeframeTotals,
      };
    }

    const monthlyMap = new Map();
    const categoryMap = new Map();
    const merchantMap = new Map();
    const merchantDrilldownMap = new Map();
    const weekdayTotals = new Array(7).fill(0);
    const categoryTimelineMap = new Map(); // month -> Map(category -> total)
    const itemTotalsMap = new Map(); // item name -> total spend

    let totalSpent = 0;
    let highestReceipt = null;

    processedReceipts.forEach((receipt) => {
      const receiptTotal = Number(receipt.total_amount) || 0;
      totalSpent += receiptTotal;

      if (!highestReceipt || receiptTotal > highestReceipt.total) {
        highestReceipt = {
          total: receiptTotal,
          merchant: receipt.merchant_name || 'Unknown merchant',
          date: receipt.transaction_date,
        };
      }

      if (receipt.dateObj) {
        const time = receipt.dateObj.getTime();

        if (time >= currentYearStartTime) {
          timeframeTotals.year.current += receiptTotal;
        } else if (time >= previousYearStartTime && time < currentYearStartTime) {
          timeframeTotals.year.previous += receiptTotal;
        }

        if (time >= currentMonthStartTime) {
          timeframeTotals.month.current += receiptTotal;
        } else if (time >= previousMonthStartTime && time < currentMonthStartTime) {
          timeframeTotals.month.previous += receiptTotal;
        }

        if (time >= currentWeekStartTime) {
          timeframeTotals.week.current += receiptTotal;
        } else if (time >= previousWeekStartTime && time < currentWeekStartTime) {
          timeframeTotals.week.previous += receiptTotal;
        }

        if (time >= currentDayStartTime) {
          timeframeTotals.day.current += receiptTotal;
        } else if (time >= previousDayStartTime && time < currentDayStartTime) {
          timeframeTotals.day.previous += receiptTotal;
        }

        const monthKey = format(receipt.dateObj, 'yyyy-MM');
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + receiptTotal);

        const weekdayIndex = receipt.dateObj.getDay();
        weekdayTotals[weekdayIndex] += receiptTotal;
      }

      const merchantName = receipt.merchant_name || 'Unknown merchant';
      merchantMap.set(merchantName, (merchantMap.get(merchantName) || 0) + receiptTotal);

      receipt.line_items.forEach((item, index) => {
        const price = Number(item.price ?? item.Price ?? 0);
        const quantityRaw = item.quantity ?? item.Quantity ?? 1;
        const quantity = Number(quantityRaw);
        const multiplier = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
        const lineTotal = price * multiplier;
        if (lineTotal <= 0) return;

        const mainCategory = item.main_category || item.Category || 'Other';
        const subCategory = item.sub_category || item.SubCategory || 'Misc';

        if (!categoryMap.has(mainCategory)) {
          categoryMap.set(mainCategory, {
            total: 0,
            subCategories: new Map(),
            items: [],
          });
        }

        const entry = categoryMap.get(mainCategory);
        entry.total += lineTotal;

        const itemName =
          item.item ||
          item.Item_Name ||
          item.name ||
          item.Name ||
          `Item ${index + 1}`;

        const itemKey = itemName.trim() || `Item ${index + 1}`;

        const lineItemRecord = {
          id: `${receipt.id || receipt.receipt_id || 'receipt'}-${index}`,
          name: itemName,
          total: roundToTwo(lineTotal),
          quantity: multiplier,
          unitPrice: price,
          merchant: receipt.merchant_name || 'Unknown merchant',
          date: receipt.transaction_date,
          mainCategory,
          subCategory,
        };

        itemTotalsMap.set(itemKey, (itemTotalsMap.get(itemKey) || 0) + lineTotal);

        entry.items.push(lineItemRecord);

        if (!entry.subCategories.has(subCategory)) {
          entry.subCategories.set(subCategory, {
            total: 0,
            items: [],
          });
        }
        const subEntry = entry.subCategories.get(subCategory);
        subEntry.total += lineTotal;
        subEntry.items.push(lineItemRecord);

        if (!merchantDrilldownMap.has(merchantName)) {
          merchantDrilldownMap.set(merchantName, {
            total: 0,
            categories: new Map(),
          });
        }
        const merchantEntry = merchantDrilldownMap.get(merchantName);
        merchantEntry.total += lineTotal;

        if (!merchantEntry.categories.has(mainCategory)) {
          merchantEntry.categories.set(mainCategory, {
            total: 0,
            subCategories: new Map(),
          });
        }
        const merchantCategoryEntry = merchantEntry.categories.get(mainCategory);
        merchantCategoryEntry.total += lineTotal;

        if (!merchantCategoryEntry.subCategories.has(subCategory)) {
          merchantCategoryEntry.subCategories.set(subCategory, {
            total: 0,
            items: [],
          });
        }
        const merchantSubEntry = merchantCategoryEntry.subCategories.get(subCategory);
        merchantSubEntry.total += lineTotal;
        merchantSubEntry.items.push(lineItemRecord);

        if (receipt.dateObj) {
          const monthKey = format(receipt.dateObj, 'yyyy-MM');
          if (!categoryTimelineMap.has(monthKey)) {
            categoryTimelineMap.set(monthKey, new Map());
          }
          const monthEntry = categoryTimelineMap.get(monthKey);
          monthEntry.set(mainCategory, (monthEntry.get(mainCategory) || 0) + lineTotal);
        }
      });
    });

    const monthlySeries = Array.from(monthlyMap.entries())
      .map(([key, value]) => {
        const parsed = parse(`${key}-01`, 'yyyy-MM-dd', new Date());
        const isValid = parsed instanceof Date && !Number.isNaN(parsed);
        return {
          key,
          label: isValid ? format(parsed, 'MMM yyyy') : key,
          value: roundToTwo(value),
          sortKey: isValid ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
        };
      })
      .sort((a, b) => a.sortKey - b.sortKey);

    const categoryHierarchy = Array.from(categoryMap.entries())
      .map(([main, details]) => ({
        name: main,
        value: roundToTwo(details.total),
        children: Array.from(details.subCategories.entries())
          .map(([sub, subDetails]) => ({
            name: sub,
            value: roundToTwo(subDetails.total),
          }))
          .sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.value - a.value);

    const categoryNames = categoryHierarchy.map((entry) => entry.name);

    const categoryDetails = {};
    categoryMap.forEach((details, name) => {
      const subCategories = Array.from(details.subCategories.entries())
        .map(([subName, subValue]) => ({
          name: subName,
          total: roundToTwo(subValue.total),
          items: subValue.items,
        }))
        .sort((a, b) => b.total - a.total);

      const subCategoryLookup = subCategories.reduce((acc, item) => {
        acc[item.name] = item;
        return acc;
      }, {});

      categoryDetails[name] = {
        name,
        total: roundToTwo(details.total),
        items: details.items,
        subCategories,
        subCategoryLookup,
      };
    });

    const merchantSeries = Array.from(merchantMap.entries())
      .map(([name, value]) => ({ name, value: roundToTwo(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const merchantDrilldownEntries = Array.from(merchantDrilldownMap.entries())
      .map(([name, merchantInfo]) => ({
        name,
        total: roundToTwo(merchantInfo.total),
        merchantInfo,
      }))
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);

    const merchantDrilldownMerchants = merchantDrilldownEntries.map(({ name, total }) => ({
      name,
      value: total,
    }));

    const merchantDetails = {};
    merchantDrilldownEntries.forEach(({ name, total, merchantInfo }) => {
      const categories = Array.from(merchantInfo.categories.entries())
        .map(([categoryName, categoryInfo]) => {
          const subCategories = Array.from(categoryInfo.subCategories.entries())
            .map(([subName, subInfo]) => ({
              name: subName,
              total: roundToTwo(subInfo.total),
              items: subInfo.items
                .slice()
                .sort((a, b) => b.total - a.total),
            }))
            .sort((a, b) => b.total - a.total);

          const subCategoryLookup = subCategories.reduce((acc, sub) => {
            acc[sub.name] = sub;
            return acc;
          }, {});

          return {
            name: categoryName,
            total: roundToTwo(categoryInfo.total),
            subCategories,
            subCategoryLookup,
          };
        })
        .sort((a, b) => b.total - a.total);

      const categoryLookup = categories.reduce((acc, category) => {
        acc[category.name] = category;
        return acc;
      }, {});

      merchantDetails[name] = {
        name,
        total,
        categories,
        categoryLookup,
      };
    });

    const merchantDrilldown = {
      merchants: merchantDrilldownMerchants,
      details: merchantDetails,
    };

    const weekdaySeries = weekDayLabels.map((label, index) => ({
      name: label,
      short: label.slice(0, 3),
      value: roundToTwo(weekdayTotals[index]),
    }));

    const monthOverMonth =
      monthlySeries.length >= 2
        ? (() => {
            const last = monthlySeries[monthlySeries.length - 1];
            const prev = monthlySeries[monthlySeries.length - 2];
            if (prev.value === 0 && last.value > 0) return Infinity;
            if (prev.value === 0) return 0;
            return ((last.value - prev.value) / prev.value) * 100;
          })()
        : null;

    const busiestDay = weekdaySeries.reduce((best, current) => {
      if (!best || current.value > best.value) return current;
      return best;
    }, null);

    const categoryTimeline =
      categoryNames.length && monthlySeries.length
        ? {
            source: [
              ['Month', ...categoryNames],
              ...monthlySeries.map(({ key, label }) => {
                const monthEntry = categoryTimelineMap.get(key) || new Map();
                return [
                  label,
                  ...categoryNames.map((category) =>
                    roundToTwo(monthEntry.get(category) || 0)
                  ),
                ];
              }),
            ],
            months: monthlySeries.map(({ key, label }) => ({ key, label })),
            categories: categoryNames,
          }
        : null;

    const itemTotals = Array.from(itemTotalsMap.entries())
      .map(([name, total]) => ({
        name,
        value: roundToTwo(total),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return {
      monthlySeries,
      categoryHierarchy,
      merchantSeries,
      merchantDrilldown,
      weekdaySeries,
      categoryTimeline,
      categoryDetails,
      categoryNames,
      itemTotals,
      timeframeInsights: timeframeTotals,
      stats: {
        totalReceipts: processedReceipts.length,
        totalSpent,
        avgPerReceipt: processedReceipts.length ? totalSpent / processedReceipts.length : 0,
        monthOverMonth,
        topCategory: categoryHierarchy[0]?.name || null,
        topMerchant: merchantSeries[0] || null,
        busiestDay,
        highestReceipt,
      },
    };
  }, [processedReceipts]);

  useEffect(() => {
    if (!analytics.categoryNames.length) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setDrillLevel('main');
      return;
    }
    if (selectedCategory && !analytics.categoryDetails?.[selectedCategory]) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setDrillLevel('main');
    }
  }, [analytics.categoryNames, analytics.categoryDetails, selectedCategory]);

  useEffect(() => {
    if (!selectedCategory) {
      if (selectedSubCategory) {
        setSelectedSubCategory(null);
      }
      if (drillLevel !== 'main') {
        setDrillLevel('main');
      }
      return;
    }
    const categoryInfo = analytics.categoryDetails?.[selectedCategory];
    if (selectedSubCategory && categoryInfo && !categoryInfo.subCategoryLookup[selectedSubCategory]) {
      setSelectedSubCategory(null);
      if (drillLevel === 'item') {
        setDrillLevel('sub');
      }
    }
    if (drillLevel === 'main') {
      setDrillLevel('sub');
    }
  }, [selectedCategory, selectedSubCategory, analytics.categoryDetails, drillLevel]);

  useEffect(() => {
    if (drillLevel === 'item' && !selectedSubCategory) {
      setDrillLevel(selectedCategory ? 'sub' : 'main');
    }
  }, [drillLevel, selectedSubCategory, selectedCategory]);

  useEffect(() => {
    const merchantData = analytics.merchantDrilldown;
    if (!merchantData?.merchants?.length) {
      setSelectedMerchant(null);
      setSelectedMerchantCategory(null);
      setSelectedMerchantSubcategory(null);
      setMerchantDrillLevel('merchant');
      return;
    }

    if (selectedMerchant && !merchantData.details?.[selectedMerchant]) {
      setSelectedMerchant(null);
      setSelectedMerchantCategory(null);
      setSelectedMerchantSubcategory(null);
      setMerchantDrillLevel('merchant');
    }
  }, [analytics.merchantDrilldown, selectedMerchant]);

  useEffect(() => {
    if (!selectedMerchant) {
      if (selectedMerchantCategory) {
        setSelectedMerchantCategory(null);
      }
      if (selectedMerchantSubcategory) {
        setSelectedMerchantSubcategory(null);
      }
      if (merchantDrillLevel !== 'merchant') {
        setMerchantDrillLevel('merchant');
      }
      return;
    }

    const merchantInfo = analytics.merchantDrilldown?.details?.[selectedMerchant];
    if (!merchantInfo) return;

    if (
      selectedMerchantCategory &&
      !merchantInfo.categoryLookup[selectedMerchantCategory]
    ) {
      setSelectedMerchantCategory(null);
      setSelectedMerchantSubcategory(null);
      setMerchantDrillLevel('main');
      return;
    }

    if (merchantDrillLevel === 'merchant' && merchantInfo.categories.length) {
      setMerchantDrillLevel('main');
    }
  }, [
    analytics.merchantDrilldown,
    selectedMerchant,
    selectedMerchantCategory,
    selectedMerchantSubcategory,
    merchantDrillLevel,
  ]);

  useEffect(() => {
    if (!selectedMerchantCategory) {
      if (selectedMerchantSubcategory) {
        setSelectedMerchantSubcategory(null);
      }
      if (merchantDrillLevel === 'sub' || merchantDrillLevel === 'item') {
        setMerchantDrillLevel(selectedMerchant ? 'main' : 'merchant');
      }
      return;
    }

    const categoryInfo =
      selectedMerchant && analytics.merchantDrilldown?.details?.[selectedMerchant]
        ? analytics.merchantDrilldown.details[selectedMerchant].categoryLookup?.[
            selectedMerchantCategory
          ]
        : null;

    if (!categoryInfo) return;

    if (
      selectedMerchantSubcategory &&
      !categoryInfo.subCategoryLookup[selectedMerchantSubcategory]
    ) {
      setSelectedMerchantSubcategory(null);
      if (merchantDrillLevel === 'item') {
        setMerchantDrillLevel('sub');
      }
      return;
    }

    if (merchantDrillLevel === 'main') {
      setMerchantDrillLevel('sub');
    }
  }, [
    analytics.merchantDrilldown,
    selectedMerchant,
    selectedMerchantCategory,
    selectedMerchantSubcategory,
    merchantDrillLevel,
  ]);

  useEffect(() => {
    if (merchantDrillLevel === 'item' && !selectedMerchantSubcategory) {
      setMerchantDrillLevel(
        selectedMerchantCategory ? 'sub' : selectedMerchant ? 'main' : 'merchant'
      );
    }
  }, [merchantDrillLevel, selectedMerchantSubcategory, selectedMerchantCategory, selectedMerchant]);

  const spendingTrendOption = useMemo(() => {
    if (!analytics.monthlySeries.length) return null;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        valueFormatter: (value) => formatCurrency(value),
      },
      grid: { left: '3%', right: '4%', bottom: '8%', top: 50, containLabel: true },
      xAxis: {
        type: 'category',
        data: analytics.monthlySeries.map((item) => item.label),
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
        axisLabel: { color: '#E2E8F0', fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: {
          color: '#E2E8F0',
          fontSize: 12,
          formatter: (value) => `£${value}`,
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      series: [
        {
          name: 'Total spend',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          data: analytics.monthlySeries.map((item) => item.value),
          lineStyle: { width: 3, color: '#8B5CF6' },
          itemStyle: { color: '#8B5CF6', borderWidth: 2, borderColor: '#F8FAFC' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.35)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0)' },
            ]),
          },
        },
      ],
    };
  }, [analytics.monthlySeries]);

  const stackedCategoryOption = useMemo(() => {
    const timeline = analytics.categoryTimeline;
    if (!timeline || !timeline.categories.length || timeline.source.length <= 1) {
      return null;
    }

    const palette = [
      { line: '#6366F1', area: ['rgba(99,102,241,0.45)', 'rgba(99,102,241,0)'] },
      { line: '#8B5CF6', area: ['rgba(139,92,246,0.45)', 'rgba(139,92,246,0)'] },
      { line: '#EC4899', area: ['rgba(236,72,153,0.45)', 'rgba(236,72,153,0)'] },
      { line: '#22D3EE', area: ['rgba(34,211,238,0.45)', 'rgba(34,211,238,0)'] },
      { line: '#F97316', area: ['rgba(249,115,22,0.45)', 'rgba(249,115,22,0)'] },
      { line: '#10B981', area: ['rgba(16,185,129,0.45)', 'rgba(16,185,129,0)'] },
      { line: '#FBBF24', area: ['rgba(251,191,36,0.45)', 'rgba(251,191,36,0)'] },
      { line: '#EF4444', area: ['rgba(239,68,68,0.45)', 'rgba(239,68,68,0)'] },
    ];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#1F2937' } },
        valueFormatter: (value) => formatCurrency(value),
      },
      legend: {
        top: 10,
        textStyle: { color: '#E2E8F0' },
      },
      grid: { left: '3%', right: '4%', bottom: '6%', top: 70, containLabel: true },
      dataset: { source: timeline.source },
      xAxis: {
        type: 'category',
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
        axisLabel: { color: '#E2E8F0', fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      series: timeline.categories.map((category, index) => {
        const colors = palette[index % palette.length];
        return {
          name: category,
          type: 'line',
          smooth: true,
          stack: 'total',
          symbol: 'none',
          lineStyle: { width: 2, color: colors.line },
          areaStyle: {
            opacity: 0.9,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colors.area[0] },
              { offset: 1, color: colors.area[1] },
            ]),
          },
          emphasis: { focus: 'series' },
        };
      }),
    };
  }, [analytics.categoryTimeline]);

  const merchantsOption = useMemo(() => {
    if (!analytics.merchantSeries.length) return null;
    const categories = [...analytics.merchantSeries].reverse();
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => formatCurrency(value),
      },
      grid: { left: '28%', right: '6%', top: 40, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: categories.map((item) => item.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#F1F5F9', fontSize: 12 },
      },
      series: [
        {
          name: 'Total spend',
          type: 'bar',
          data: categories.map((item) => item.value),
          barWidth: 16,
          itemStyle: {
            borderRadius: [0, 12, 12, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#6366F1' },
              { offset: 1, color: '#8B5CF6' },
            ]),
          },
        },
      ],
    };
  }, [analytics.merchantSeries]);

  const weekdayOption = useMemo(() => {
    if (!analytics.weekdaySeries.length) return null;
    const average =
      analytics.weekdaySeries.reduce((sum, item) => sum + item.value, 0) /
      (analytics.weekdaySeries.length || 1);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => formatCurrency(value),
      },
      legend: {
        data: ['Weekday spend', 'Average'],
        top: 10,
        textStyle: { color: '#E2E8F0' },
      },
      grid: { left: '4%', right: '4%', bottom: '6%', top: 60, containLabel: true },
      xAxis: [
        {
          type: 'category',
          data: analytics.weekdaySeries.map((item) => item.short),
          axisTick: { alignWithLabel: true },
          axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
          axisLabel: { color: '#E2E8F0', fontSize: 12 },
        },
      ],
      yAxis: [
        {
          type: 'value',
          axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
        },
      ],
      series: [
        {
          name: 'Weekday spend',
          type: 'bar',
          barWidth: 24,
          data: analytics.weekdaySeries.map((item) => item.value),
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: '#34D399',
          },
          emphasis: {
            itemStyle: {
              color: '#10B981',
            },
          },
        },
        {
          name: 'Average',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2, type: 'dashed', color: '#F97316' },
          data: analytics.weekdaySeries.map(() => roundToTwo(average)),
        },
      ],
    };
  }, [analytics.weekdaySeries]);

  const selectedCategoryDetails = selectedCategory
    ? analytics.categoryDetails?.[selectedCategory] || null
    : null;

  const selectedSubcategoryDetails =
    selectedCategoryDetails && selectedSubCategory
      ? selectedCategoryDetails.subCategoryLookup?.[selectedSubCategory] || null
      : null;

  const selectedMerchantDetails = selectedMerchant
    ? analytics.merchantDrilldown?.details?.[selectedMerchant] || null
    : null;

  const selectedMerchantCategoryDetails =
    selectedMerchantDetails && selectedMerchantCategory
      ? selectedMerchantDetails.categoryLookup?.[selectedMerchantCategory] || null
      : null;

  const selectedMerchantSubcategoryDetails =
    selectedMerchantCategoryDetails && selectedMerchantSubcategory
      ? selectedMerchantCategoryDetails.subCategoryLookup?.[selectedMerchantSubcategory] || null
      : null;

  const drilldownOption = useMemo(() => {
    if (!analytics.categoryNames.length) return null;

    const palette = [
      '#6366F1',
      '#EC4899',
      '#F97316',
      '#22D3EE',
      '#10B981',
      '#FBBF24',
      '#8B5CF6',
      '#EF4444',
      '#14B8A6',
      '#A855F7',
    ];

    let entries = [];

    if (drillLevel === 'main') {
      entries = analytics.categoryNames.map((name) => ({
        label: name,
        value: analytics.categoryDetails?.[name]?.total || 0,
      }));
    } else if (drillLevel === 'sub' && selectedCategoryDetails) {
      entries = selectedCategoryDetails.subCategories.map((sub) => ({
        label: sub.name,
        value: sub.total,
      }));
    } else if (drillLevel === 'item') {
      const sourceItems =
        (selectedSubcategoryDetails && selectedSubcategoryDetails.items) ||
        (selectedCategoryDetails && selectedCategoryDetails.items) ||
        [];
      entries = sourceItems.map((item) => ({
        label: item.name,
        value: item.total,
        merchant: item.merchant,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        date: item.date,
        subCategory: item.subCategory || selectedSubCategory || '',
      }));
    }

    const filteredEntries = entries
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, drillLevel === 'item' ? 12 : 10);

    if (!filteredEntries.length) return null;

    const labelCounts = filteredEntries.reduce((acc, entry) => {
      const key = entry.label || 'Unnamed item';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const labelIndex = {};
    const displayLabels = filteredEntries.map((entry) => {
      const base = entry.label || 'Unnamed item';
      if (labelCounts[base] > 1) {
        const nextIndex = (labelIndex[base] || 0) + 1;
        labelIndex[base] = nextIndex;
        return `${base} (${nextIndex})`;
      }
      return base;
    });

    const dataSeries = filteredEntries.map((entry, index) => ({
      value: entry.value,
      name: displayLabels[index],
      raw: entry,
      itemStyle: {
        color: palette[index % palette.length],
      },
    }));

    const reversedLabels = displayLabels.slice().reverse();
    const reversedSeries = dataSeries.slice().reverse();

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params?.length) return '';
          const [first] = params;
          const rawEntry = first.data?.raw;
          const label = rawEntry?.label || first.name;
          const lines = [`${label}: ${formatCurrency(first.value)}`];
          if (drillLevel === 'item' && rawEntry) {
            if (rawEntry.merchant) {
              lines.push(`Merchant: ${rawEntry.merchant}`);
            }
            if (Number.isFinite(rawEntry.quantity) && Number.isFinite(rawEntry.unitPrice)) {
              lines.push(`Qty ${rawEntry.quantity} × ${formatCurrency(rawEntry.unitPrice)}`);
            }
            if (rawEntry.date) {
              lines.push(`Date: ${formatDisplayDate(rawEntry.date)}`);
            }
          }
          return lines.join('<br/>');
        },
      },
      grid: { left: '32%', right: '8%', top: 40, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: reversedLabels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#F8FAFC', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: reversedSeries,
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            color: '#E2E8F0',
            formatter: ({ value }) => formatCurrency(value),
          },
        },
      ],
    };
  }, [
    analytics.categoryNames,
    analytics.categoryDetails,
    drillLevel,
    selectedCategoryDetails,
    selectedSubcategoryDetails,
    selectedSubCategory,
  ]);

  const merchantDrilldownOption = useMemo(() => {
    const drillData = analytics.merchantDrilldown;
    if (!drillData?.merchants?.length) return null;

    const palette = [
      '#22D3EE',
      '#8B5CF6',
      '#F97316',
      '#34D399',
      '#FBBF24',
      '#6366F1',
      '#EF4444',
      '#14B8A6',
      '#F472B6',
      '#60A5FA',
    ];

    let entries = [];

    if (merchantDrillLevel === 'merchant') {
      entries = drillData.merchants.map((merchant) => ({
        label: merchant.name,
        value: merchant.value,
      }));
    } else if (merchantDrillLevel === 'main' && selectedMerchantDetails) {
      entries = selectedMerchantDetails.categories.map((category) => ({
        label: category.name,
        value: category.total,
      }));
    } else if (merchantDrillLevel === 'sub' && selectedMerchantCategoryDetails) {
      entries = selectedMerchantCategoryDetails.subCategories.map((sub) => ({
        label: sub.name,
        value: sub.total,
      }));
    } else if (merchantDrillLevel === 'item' && selectedMerchantSubcategoryDetails) {
      entries = selectedMerchantSubcategoryDetails.items.map((item) => ({
        label: item.name,
        value: item.total,
        merchant: item.merchant,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        date: item.date,
        mainCategory: item.mainCategory,
        subCategory: item.subCategory,
      }));
    }

    const filteredEntries = (entries || [])
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, merchantDrillLevel === 'item' ? 12 : 10);

    if (!filteredEntries.length) return null;

    const labelCounts = filteredEntries.reduce((acc, entry) => {
      const key = entry.label || 'Unnamed';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const labelIndex = {};
    const displayLabels = filteredEntries.map((entry) => {
      const base = entry.label || 'Unnamed';
      if (labelCounts[base] > 1) {
        const idx = (labelIndex[base] || 0) + 1;
        labelIndex[base] = idx;
        return `${base} (${idx})`;
      }
      return base;
    });

    const dataSeries = filteredEntries.map((entry, index) => ({
      value: entry.value,
      name: displayLabels[index],
      raw: entry,
      itemStyle: {
        color: palette[index % palette.length],
      },
    }));

    const reversedLabels = displayLabels.slice().reverse();
    const reversedSeries = dataSeries.slice().reverse();

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          if (!params?.length) return '';
          const [first] = params;
          const rawEntry = first.data?.raw;
          const label = rawEntry?.label || first.name;
          const lines = [`${label}: ${formatCurrency(first.value)}`];
          if (merchantDrillLevel === 'item' && rawEntry) {
            if (rawEntry.mainCategory) {
              lines.push(`Main category: ${rawEntry.mainCategory}`);
            }
            if (rawEntry.subCategory) {
              lines.push(`Sub-category: ${rawEntry.subCategory}`);
            }
            if (Number.isFinite(rawEntry.quantity) && Number.isFinite(rawEntry.unitPrice)) {
              lines.push(`Qty ${rawEntry.quantity} × ${formatCurrency(rawEntry.unitPrice)}`);
            }
            if (rawEntry.date) {
              lines.push(`Date: ${formatDisplayDate(rawEntry.date)}`);
            }
          }
          return lines.join('<br/>');
        },
      },
      grid: { left: '32%', right: '8%', top: 40, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: reversedLabels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#F8FAFC', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: reversedSeries,
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            color: '#E2E8F0',
            formatter: ({ value }) => formatCurrency(value),
          },
        },
      ],
    };
  }, [
    analytics.merchantDrilldown,
    merchantDrillLevel,
    selectedMerchantDetails,
    selectedMerchantCategoryDetails,
    selectedMerchantSubcategoryDetails,
  ]);

  const handleDrillClick = (params) => {
    const targetName = params?.data?.raw?.label || params?.name;
    if (!targetName) return;
    if (drillLevel === 'main') {
      setSelectedCategory(targetName);
      setDrillLevel('sub');
    } else if (drillLevel === 'sub') {
      setSelectedSubCategory(targetName);
      setDrillLevel('item');
    }
  };

  const stepBack = () => {
    if (drillLevel === 'item') {
      setDrillLevel('sub');
      setSelectedSubCategory(null);
    } else if (drillLevel === 'sub') {
      setDrillLevel('main');
      setSelectedCategory(null);
    }
  };

  const handleMerchantDrillClick = (params) => {
    const targetName = params?.data?.raw?.label || params?.name;
    if (!targetName) return;

    if (merchantDrillLevel === 'merchant') {
      setSelectedMerchant(targetName);
      setMerchantDrillLevel('main');
    } else if (merchantDrillLevel === 'main') {
      setSelectedMerchantCategory(targetName);
      setMerchantDrillLevel('sub');
    } else if (merchantDrillLevel === 'sub') {
      setSelectedMerchantSubcategory(targetName);
      setMerchantDrillLevel('item');
    }
  };

  const merchantStepBack = () => {
    if (merchantDrillLevel === 'item') {
      setMerchantDrillLevel('sub');
      setSelectedMerchantSubcategory(null);
    } else if (merchantDrillLevel === 'sub') {
      setMerchantDrillLevel('main');
      setSelectedMerchantCategory(null);
    } else if (merchantDrillLevel === 'main') {
      setMerchantDrillLevel('merchant');
      setSelectedMerchant(null);
    }
  };

  const clearMerchantSelection = () => {
    setSelectedMerchant(null);
    setSelectedMerchantCategory(null);
    setSelectedMerchantSubcategory(null);
    setMerchantDrillLevel('merchant');
  };

  const drilldownDescription = useMemo(() => {
    if (drillLevel === 'main') {
      return 'Explore your highest-spend categories. Click a bar to drill into its sub-categories.';
    }
    if (drillLevel === 'sub') {
      return `Viewing sub-categories inside ${selectedCategory}. Choose one to reveal its line items.`;
    }
    if (drillLevel === 'item') {
      return `Line items for ${selectedSubCategory || 'selection'} in ${selectedCategory}.`;
    }
    return '';
  }, [drillLevel, selectedCategory, selectedSubCategory]);

  const drilldownPath = useMemo(() => {
    if (drillLevel === 'main') return 'All categories';
    if (drillLevel === 'sub') return `All categories › ${selectedCategory}`;
    if (drillLevel === 'item') {
      const subLabel = selectedSubCategory || 'Line items';
      return `All categories › ${selectedCategory} › ${subLabel}`;
    }
    return '';
  }, [drillLevel, selectedCategory, selectedSubCategory]);

  const drilldownHeaderAction = (
    <div className="flex items-center gap-3 text-xs text-gray-400">
      <span className="hidden sm:inline">{drilldownPath}</span>
      {drillLevel !== 'main' && (
        <button
          onClick={stepBack}
          className="text-xs font-semibold uppercase tracking-widest text-violet-300 hover:text-violet-100 transition-colors"
        >
          Back
        </button>
      )}
    </div>
  );

  const merchantDrilldownDescription = useMemo(() => {
    if (merchantDrillLevel === 'merchant') {
      return 'Review where your spending concentrates. Click a merchant to inspect its category mix.';
    }
    if (merchantDrillLevel === 'main' && selectedMerchant) {
      return `Viewing ${selectedMerchant}'s categories. Choose one to uncover its sub-categories.`;
    }
    if (merchantDrillLevel === 'sub' && selectedMerchant && selectedMerchantCategory) {
      return `Exploring ${selectedMerchantCategory} from ${selectedMerchant}. Drill into a sub-category to reveal items.`;
    }
    if (merchantDrillLevel === 'item' && selectedMerchant && selectedMerchantSubcategory) {
      return `Line items contributing to ${selectedMerchantSubcategory} at ${selectedMerchant}.`;
    }
    return '';
  }, [merchantDrillLevel, selectedMerchant, selectedMerchantCategory, selectedMerchantSubcategory]);

  const merchantDrilldownPath = useMemo(() => {
    const segments = ['All merchants'];
    if (selectedMerchant) segments.push(selectedMerchant);
    if (selectedMerchantCategory) segments.push(selectedMerchantCategory);
    if (selectedMerchantSubcategory) segments.push(selectedMerchantSubcategory);
    return segments.join(' › ');
  }, [selectedMerchant, selectedMerchantCategory, selectedMerchantSubcategory]);

  const merchantDrilldownHeaderAction = (
    <div className="flex items-center gap-3 text-xs text-gray-400">
      <span className="hidden sm:inline">{merchantDrilldownPath}</span>
      {merchantDrillLevel !== 'merchant' && (
        <div className="flex items-center gap-2">
          <button
            onClick={merchantStepBack}
            className="text-xs font-semibold uppercase tracking-widest text-violet-300 hover:text-violet-100 transition-colors"
          >
            Back
          </button>
          <button
            onClick={clearMerchantSelection}
            className="text-xs font-semibold uppercase tracking-widest text-violet-300 hover:text-violet-100 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );

  const drilldownEmptyMessage = useMemo(() => {
    if (!analytics.categoryNames.length) {
      return 'No categorised spending yet. Scan receipts with line items to populate this view.';
    }
    if (drillLevel === 'sub') {
      return 'This category has no sub-categories recorded yet.';
    }
    if (drillLevel === 'item') {
      return 'No line items captured for this sub-category.';
    }
    return 'No data available yet.';
  }, [analytics.categoryNames, drillLevel]);

  const merchantDrilldownEmptyMessage = useMemo(() => {
    if (!analytics.merchantDrilldown?.merchants?.length) {
      return 'No merchant insights yet. Scan receipts with line items to populate this view.';
    }
    if (merchantDrillLevel === 'main') {
      return 'This merchant has no categorised spend yet.';
    }
    if (merchantDrillLevel === 'sub') {
      return 'No sub-categories recorded for this selection.';
    }
    if (merchantDrillLevel === 'item') {
      return 'No line items captured for this sub-category.';
    }
    return 'No data available yet.';
  }, [analytics.merchantDrilldown, merchantDrillLevel]);

  const itemTotalsOption = useMemo(() => {
    if (!analytics.itemTotals.length) return null;

    const palette = [
      '#38BDF8',
      '#818CF8',
      '#F97316',
      '#34D399',
      '#EC4899',
      '#FBBF24',
      '#60A5FA',
      '#F472B6',
      '#10B981',
      '#F59E0B',
      '#A855F7',
      '#EF4444',
    ];

    const entries = analytics.itemTotals
      .filter((entry) => entry.value > 0)
      .slice(0, 12);

    const categories = entries.map((entry) => entry.name);
    const dataSeries = entries.map((entry, index) => ({
      value: entry.value,
      name: entry.name,
      itemStyle: { color: palette[index % palette.length] },
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (value) => formatCurrency(value),
      },
      grid: { left: '32%', right: '8%', top: 40, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: categories.slice().reverse(),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#F8FAFC', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: dataSeries.slice().reverse(),
          barWidth: 18,
          label: {
            show: true,
            position: 'right',
            color: '#E2E8F0',
            formatter: ({ value }) => formatCurrency(value),
          },
        },
      ],
    };
  }, [analytics.itemTotals]);

  const insightHighlights = useMemo(() => {
    if (!analytics.stats) return [];
    const highlights = [];
    const { topCategory, topMerchant, monthOverMonth, busiestDay, highestReceipt } = analytics.stats;

    if (topCategory) {
      highlights.push(`Most of your item-level spending flows into the ${topCategory} category.`);
    }

    if (topMerchant) {
      highlights.push(
        `Your highest spend with a single merchant is ${formatCurrency(topMerchant.value)} at ${
          topMerchant.name
        }.`
      );
    }

    if (Number.isFinite(monthOverMonth)) {
      const trendWord = monthOverMonth > 0 ? 'increased' : monthOverMonth < 0 ? 'decreased' : 'stayed flat';
      const pct = Math.abs(monthOverMonth).toFixed(1);
      highlights.push(`Month-over-month spend ${trendWord} by ${pct}% compared with the previous month.`);
    } else if (monthOverMonth === Infinity) {
      highlights.push('Spending resumed this month after no recorded spend in the previous month.');
    }

    if (busiestDay && busiestDay.value > 0) {
      highlights.push(
        `Your biggest shopping day is ${busiestDay.name}, averaging ${formatCurrency(busiestDay.value)}.`
      );
    }

    if (highestReceipt && highestReceipt.total > 0) {
      const highDate = highestReceipt.date ? new Date(highestReceipt.date) : null;
      const dateString =
        highDate && !Number.isNaN(highDate)
          ? format(highDate, 'dd MMM yyyy')
          : highestReceipt.date || 'recently';
      highlights.push(
        `Largest single receipt: ${formatCurrency(highestReceipt.total)} at ${highestReceipt.merchant} on ${dateString}.`
      );
    }

    return highlights;
  }, [analytics.stats]);

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-950 text-gray-100 font-sans">
      <AnimatedSection>
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Insights & Analytics
          </h1>
          <p className="text-sm md:text-base text-gray-400 max-w-3xl leading-relaxed">
            Explore intelligent perspectives derived from your receipts. These interactive ECharts visuals highlight
            spending patterns, top merchants, and opportunities to optimise your budget.
          </p>
        </div>
      </AnimatedSection>

      {error && (
        <AnimatedSection delay={0.05}>
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        </AnimatedSection>
      )}

      <AnimatedSection delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-6">
          <StatsCard
            label="Total Spend Captured"
            value={formatCurrency(analytics.stats?.totalSpent || 0)}
            helper={`Across ${analytics.stats?.totalReceipts || 0} receipts`}
          />
          <StatsCard
            label="Average Per Receipt"
            value={formatCurrency(analytics.stats?.avgPerReceipt || 0)}
            helper="Smarter batching keeps individual trips lower"
          />
          <StatsCard
            label="Top Category"
            value={analytics.stats?.topCategory || '—'}
            helper="Based on captured line items"
          />
          <StatsCard
            label="Month-over-Month"
            value={
              analytics.stats?.monthOverMonth == null
                ? '—'
                : analytics.stats.monthOverMonth === Infinity
                ? 'New spend'
                : `${analytics.stats.monthOverMonth > 0 ? '+' : ''}${analytics.stats.monthOverMonth.toFixed(1)}%`
            }
            helper="Change versus previous month"
          />
        </div>
      </AnimatedSection>

      {analytics.timeframeInsights && (
        <AnimatedSection delay={0.07}>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <TimeframeCard
              label="Year to Date"
              current={analytics.timeframeInsights.year.current}
              previous={analytics.timeframeInsights.year.previous}
            />
            <TimeframeCard
              label="This Month"
              current={analytics.timeframeInsights.month.current}
              previous={analytics.timeframeInsights.month.previous}
            />
            <TimeframeCard
              label="This Week"
              current={analytics.timeframeInsights.week.current}
              previous={analytics.timeframeInsights.week.previous}
            />
            <TimeframeCard
              label="Today"
              current={analytics.timeframeInsights.day.current}
              previous={analytics.timeframeInsights.day.previous}
            />
          </div>
        </AnimatedSection>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 mt-8">
        <AnimatedSection delay={0.1}>
          <ChartCard
            title="Monthly Spend Trend"
            description="Follow how your overall expenditure evolves month-to-month. Hover over the line to inspect exact totals."
            option={spendingTrendOption}
            isLoading={isLoading}
            hasData={Boolean(analytics.monthlySeries.length)}
            height={320}
          />
        </AnimatedSection>
        <AnimatedSection delay={0.12}>
          <ChartCard
            title="Category Momentum"
            description="Stacked view of monthly outlay by main category. Click a category to drill into its sub-categories."
            option={stackedCategoryOption}
            isLoading={isLoading}
            hasData={Boolean(analytics.categoryTimeline && analytics.categoryTimeline.source.length > 1)}
            emptyMessage="Capture receipts with line items to unlock category trends."
            height={320}
          />
        </AnimatedSection>
        <AnimatedSection delay={0.14}>
          <ChartCard
            title="Top Merchants"
            description="Identify where you allocate the most money. This highlights your top merchants by total spend."
            option={merchantsOption}
            isLoading={isLoading}
            hasData={Boolean(analytics.merchantSeries.length)}
            height={320}
          />
        </AnimatedSection>
        <AnimatedSection delay={0.16}>
          <ChartCard
            title="Weekday Intensity"
            description="Understand which days of the week drive the biggest spending spikes."
            option={weekdayOption}
            isLoading={isLoading}
            hasData={Boolean(analytics.weekdaySeries.some((item) => item.value > 0))}
            height={320}
          />
        </AnimatedSection>
      </div>

      <AnimatedSection delay={0.18}>
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          <ChartCard
            title="Category Drilldown"
            description={drilldownDescription}
            option={drilldownOption}
            isLoading={isLoading}
            hasData={Boolean(drilldownOption)}
            onEvents={drilldownOption ? { click: handleDrillClick } : undefined}
            emptyMessage={drilldownEmptyMessage}
            headerAction={drilldownHeaderAction}
            height={300}
          />
          <ChartCard
            title="Merchant Breakdown"
            description={merchantDrilldownDescription}
            option={merchantDrilldownOption}
            isLoading={isLoading}
            hasData={Boolean(merchantDrilldownOption)}
            onEvents={merchantDrilldownOption ? { click: handleMerchantDrillClick } : undefined}
            emptyMessage={merchantDrilldownEmptyMessage}
            headerAction={merchantDrilldownHeaderAction}
            height={300}
          />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.22}>
        <div className="mt-8">
          <ChartCard
            title="Top Receipt Items"
            description="Quick view of the items capturing the most spend across all receipts."
            option={itemTotalsOption}
            isLoading={isLoading}
            hasData={Boolean(itemTotalsOption)}
            emptyMessage="Add more receipts with line items to populate this chart."
            height={300}
          />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="mt-8 bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
          <h2 className="text-lg md:text-xl font-semibold text-white font-display">Key takeaways</h2>
          <p className="text-sm text-gray-400 mt-2 mb-4">
            A quick narrative summary distilled from your latest data points.
          </p>
          {insightHighlights.length ? (
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-gray-200">
              {insightHighlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">
              Add more receipts to unlock personalised insights and recommendations.
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
}
