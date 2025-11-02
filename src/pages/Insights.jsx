import React, { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { format, parse } from 'date-fns';

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

export default function Insights() {
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [drillLevel, setDrillLevel] = useState('main');

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
    if (!processedReceipts.length) {
      return {
        monthlySeries: [],
        categoryHierarchy: [],
        merchantSeries: [],
        weekdaySeries: [],
        categoryTimeline: null,
        categoryDetails: {},
        categoryNames: [],
        itemTotals: [],
        stats: null,
      };
    }

    const monthlyMap = new Map();
    const categoryMap = new Map();
    const merchantMap = new Map();
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
      weekdaySeries,
      categoryTimeline,
      categoryDetails,
      categoryNames,
       itemTotals,
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
        name,
        value: analytics.categoryDetails?.[name]?.total || 0,
      }));
    } else if (drillLevel === 'sub' && selectedCategoryDetails) {
      entries = selectedCategoryDetails.subCategories.map((sub) => ({
        name: sub.name,
        value: sub.total,
      }));
    } else if (drillLevel === 'item') {
      const sourceItems =
        (selectedSubcategoryDetails && selectedSubcategoryDetails.items) ||
        (selectedCategoryDetails && selectedCategoryDetails.items) ||
        [];
      entries = sourceItems.map((item) => ({
        name: `${item.name} • ${item.merchant}`,
        value: item.total,
      }));
    }

    const filteredEntries = entries
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, drillLevel === 'item' ? 12 : 10);

    if (!filteredEntries.length) return null;

    const categories = filteredEntries.map((entry) => entry.name);
    const dataSeries = filteredEntries.map((entry, index) => ({
      value: entry.value,
      name: entry.name,
      itemStyle: {
        color: palette[index % palette.length],
      },
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
  }, [
    analytics.categoryNames,
    analytics.categoryDetails,
    drillLevel,
    selectedCategoryDetails,
    selectedSubcategoryDetails,
  ]);

  const visibleLineItems = useMemo(() => {
    if (drillLevel === 'item' && selectedSubcategoryDetails?.items?.length) {
      return selectedSubcategoryDetails.items.slice(0, 12);
    }
    if (drillLevel === 'sub' && selectedCategoryDetails?.items?.length) {
      return selectedCategoryDetails.items.slice(0, 12);
    }
    return [];
  }, [drillLevel, selectedCategoryDetails, selectedSubcategoryDetails]);

  const handleDrillClick = (params) => {
    if (!params?.name) return;
    if (drillLevel === 'main') {
      setSelectedCategory(params.name);
      setDrillLevel('sub');
    } else if (drillLevel === 'sub') {
      setSelectedSubCategory(params.name);
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

  const clearCategorySelection = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setDrillLevel('main');
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

  const lineItemTitle = useMemo(() => {
    if (drillLevel === 'item') {
      return `Line items — ${selectedSubCategory || 'Selection'}`;
    }
    if (drillLevel === 'sub') {
      return `Recent items — ${selectedCategory}`;
    }
    return 'Line item drill-down';
  }, [drillLevel, selectedCategory, selectedSubCategory]);

  const lineItemSubtitle = useMemo(() => {
    if (drillLevel === 'main') {
      return 'Use the drilldown chart to pick a category and surface its receipts.';
    }
    if (drillLevel === 'sub') {
      return 'Click a sub-category bar to focus on its underlying line items.';
    }
    if (drillLevel === 'item') {
      return 'Showing top items powering this slice. Clear to explore another path.';
    }
    return '';
  }, [drillLevel]);

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
          <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-white font-display">
                  {lineItemTitle}
                </h2>
                <p className="text-xs text-gray-500 uppercase tracking-[0.28em] mt-1">
                  {drilldownPath}
                </p>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  {lineItemSubtitle}
                </p>
              </div>
              {drillLevel !== 'main' && (
                <button
                  onClick={clearCategorySelection}
                  className="text-xs font-semibold uppercase tracking-widest text-violet-300 hover:text-violet-100 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-4 flex-1 overflow-hidden">
              {selectedCategoryDetails && drillLevel !== 'main' && (
                <div className="mb-4 flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>
                    Main total: {formatCurrency(selectedCategoryDetails.total)} • Items:{' '}
                    {selectedCategoryDetails.items.length}
                  </span>
                  {selectedSubcategoryDetails && (
                    <span>
                      Sub total: {formatCurrency(selectedSubcategoryDetails.total)} • Items:{' '}
                      {selectedSubcategoryDetails.items.length}
                    </span>
                  )}
                </div>
              )}
              {drillLevel !== 'main' ? (
                visibleLineItems.length ? (
                  <div className="space-y-3 overflow-y-auto pr-2 max-h-[300px]">
                    {visibleLineItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-white">{item.name}</span>
                          <span className="font-semibold text-violet-300">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          <span>
                            Qty {item.quantity} × {formatCurrency(item.unitPrice)}
                          </span>
                          <span>{item.merchant}</span>
                          <span>{formatDisplayDate(item.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-4">
                    No line items found for this selection yet.
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-6">
                  Choose a category from the drilldown chart to see contributing items.
                </div>
              )}
            </div>
          </div>
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
