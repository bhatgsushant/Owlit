import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import ReceiptsAnalyticsTable from '../components/ReceiptsAnalyticsTable';
import ItemPriceTrendChart from '@/components/analytics/ItemPriceTrendChart';
import BasketCompositionChart from '@/components/analytics/BasketCompositionChart';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer as ReResponsiveContainer,
  BarChart as ReBarChart,
  Bar as ReBar,
  XAxis as ReXAxis,
  YAxis as ReYAxis,
  Tooltip as ReTooltip,
  Cell as ReCell,
  LabelList as ReLabelList,
} from 'recharts';
import {
  format,
  parseISO,
  startOfYear,
  startOfMonth,
  startOfWeek,
  startOfQuarter,
  startOfDay,
  subYears,
  subMonths,
  subWeeks,
  subDays,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';

const weekDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const merchantBarPalette = ['#F97316', '#0EA5E9', '#22C55E', '#A855F7', '#F43F5E', '#EAB308'];

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

const truncateLabel = (value, maxLength = 26) => {
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
};

const formatCategoryLabel = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const periodGranularities = ['day', 'week', 'month', 'quarter', 'year'];

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};


const useAnimatedNumber = (target, duration = 900) => {
  const [displayValue, setDisplayValue] = useState(Number(target) || 0);
  const previousRef = useRef(Number(target) || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const nextValue = Number(target) || 0;
    const startValue = previousRef.current;
    const delta = nextValue - startValue;
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.0001) {
      previousRef.current = nextValue;
      setDisplayValue(nextValue);
      return () => null;
    }

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      setDisplayValue(startValue + delta * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = nextValue;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return displayValue;
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
  actions,
  controls,
  customContent,
}) => {
  const hasOption = Boolean(option);
  const shouldRender = customContent ? hasData : (hasOption && hasData);
  const shellClasses = 'w-full h-full rounded-2xl border border-white/10 bg-white/5 p-4';
  const normalizedOption = hasOption
    ? {
        ...option,
        textStyle: {
          color: '#ffffff',
          ...(option.textStyle || {}),
        },
      }
    : null;

  return (
    <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 flex flex-col gap-4 shadow-2xl backdrop-blur">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg md:text-xl font-semibold text-white font-display">{title}</h2>
          {actions}
        </div>
        {description && (
          <div className="text-sm text-gray-300 leading-relaxed">
            {typeof description === 'string' ? description : description}
          </div>
        )}
        {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
      </div>
      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <div className={`${shellClasses} animate-pulse`} style={{ height }} />
        ) : shouldRender ? (
          <div className={shellClasses} style={{ height }}>
            <div className="w-full h-full">
              {customContent ? (
                customContent
              ) : (
                <ReactECharts
                  option={normalizedOption}
                  style={{ height: '100%', width: '100%' }}
                  notMerge
                  lazyUpdate
                  onEvents={onEvents}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-500 text-center px-4">
            {emptyMessage || 'No data available yet. Scan a receipt to unlock insights.'}
          </div>
        )}
      </div>
    </div>
  );
};

const DrilldownControls = ({ segments = [], onBack, canGoBack }) => (
  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
    <button
      type="button"
      onClick={onBack}
      disabled={!canGoBack}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition ${
        canGoBack
          ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
          : 'border-white/5 bg-white/5 text-white/40 cursor-not-allowed'
      }`}
    >
      <ArrowLeft size={12} />
      Back
    </button>
    <div className="flex flex-wrap items-center gap-1">
      {segments.map((segment, idx) => (
        <React.Fragment key={`${segment.label}-${idx}`}>
          <button
            type="button"
            onClick={segment.onClick}
            disabled={segment.active || !segment.onClick}
            className={`rounded-full px-2 py-0.5 transition ${
              segment.active
                ? 'bg-white/20 text-white cursor-default'
                : segment.onClick
                ? 'text-gray-300 hover:text-white'
                : 'text-gray-500 cursor-default'
            }`}
          >
            {segment.label}
          </button>
          {idx < segments.length - 1 && <span className="text-gray-500">/</span>}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ViewToggle = ({ mode, onChange }) => (
  <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 text-[11px] text-white overflow-hidden">
    <button
      type="button"
      onClick={() => onChange('value')}
      className={`px-3 py-1 transition ${mode === 'value' ? 'bg-emerald-500/80 text-white' : 'text-gray-300 hover:text-white'}`}
    >
      £ Value
    </button>
    <button
      type="button"
      onClick={() => onChange('percent')}
      className={`px-3 py-1 transition ${mode === 'percent' ? 'bg-emerald-500/80 text-white' : 'text-gray-300 hover:text-white'}`}
    >
      % Share
    </button>
  </div>
);

const MerchantTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-semibold">{datum.name}</p>
      <p className="text-gray-200">Spend: {formatCurrency(datum.value)}</p>
      <p className="text-gray-400">Share: {datum.percent.toFixed(1)}%</p>
    </div>
  );
};

const StatsCard = ({ label, value = 0, helper }) => {
  const isNumber = typeof value === 'number' && Number.isFinite(value);
  const animatedValue = useAnimatedNumber(isNumber ? value : 0);
  const displayValue = isNumber ? formatCurrency(animatedValue) : value;
  return (
    <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-4 md:p-6 flex flex-col gap-2 shadow-xl backdrop-blur md:min-h-[140px]">
      <span className="text-xs uppercase tracking-[0.2em] text-gray-300 font-semibold">{label}</span>
      <span className="text-2xl md:text-3xl font-bold text-white font-display">
        {displayValue}
      </span>
      {helper && <span className="text-xs text-gray-400 leading-relaxed">{helper}</span>}
    </div>
  );
};

const TimeframeCard = ({ label, current = 0, previous = 0 }) => {
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

  const animatedCurrent = useAnimatedNumber(current);
  const animatedPrevious = useAnimatedNumber(previous);

  return (
    <div className="bg-white/5 dark:bg-black/30 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md flex flex-col gap-2 shadow-xl">
      <span className="text-xs uppercase tracking-[0.32em] text-gray-300 font-semibold">{label}</span>
      <span className="text-xl md:text-2xl font-semibold text-white font-display">
        {formatCurrency(animatedCurrent)}
      </span>
      <span className={`text-xs font-medium ${deltaClass}`}>
        {deltaLabel}{' '}
        <span className="text-gray-400">
          {delta === 0 ? '' : 'vs previous'}
        </span>
      </span>
      {previous > 0 && (
        <span className="text-[11px] text-gray-400">
          Previous: {formatCurrency(animatedPrevious)}
        </span>
      )}
    </div>
  );
};

const granularityOrder = ['day', 'week', 'month', 'quarter', 'year'];

const granularityLabels = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  year: 'Year',
};

const TimeGranularityToggle = ({ value, onChange }) => (
  <div className="inline-flex flex-wrap items-center justify-center rounded-full border border-white/12 bg-white/5 p-1 text-[0.65rem] sm:text-xs font-semibold text-slate-200 shadow-inner shadow-black/10 gap-1 w-full sm:w-auto">
    {granularityOrder.map((key) => {
      const active = key === value;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`relative rounded-full px-2.5 sm:px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
            active
              ? 'bg-emerald-500/25 text-emerald-200 shadow-md shadow-emerald-500/20'
              : 'hover:bg-white/10 hover:text-slate-100'
          }`}
        >
          {granularityLabels[key]}
        </button>
      );
    })}
  </div>
);

const TimeframeControls = ({
  timeGranularity,
  onGranularityChange,
  supportsYearSelection,
  requiresMonthSelection,
  yearOptions,
  monthOptions,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  children,
  className = '',
}) => {
  const isNarrow = useIsMobile(640);
  const containerClasses = [
    'flex flex-wrap items-center gap-2 text-[0.65rem] sm:text-xs justify-end',
  ];
  if (className) containerClasses.push(className);

  const selectBaseClasses =
    'rounded-full border border-white/15 bg-white/10 px-3 py-1 font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 w-full sm:w-auto min-w-[140px]';

  return (
    <div className={containerClasses.join(' ')}>
      <div className={`flex flex-wrap gap-2 ${isNarrow ? 'w-full' : ''}`}>
        <TimeGranularityToggle value={timeGranularity} onChange={onGranularityChange} />
      </div>
      {supportsYearSelection && yearOptions.length > 0 && (
        <select
          value={selectedYear ?? ''}
          onChange={(event) => onYearChange?.(event.target.value === '' ? null : Number(event.target.value))}
          className={selectBaseClasses}
        >
          {yearOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
      )}
      {requiresMonthSelection && monthOptions.length > 0 && (
        <select
          value={selectedMonth ?? ''}
          onChange={(event) => onMonthChange?.(event.target.value === '' ? null : Number(event.target.value))}
          className={selectBaseClasses}
        >
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
              {option.label}
            </option>
          ))}
        </select>
      )}
      {children}
    </div>
  );
};

export default function Insights() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [drillLevel, setDrillLevel] = useState('main');
  const [merchantDrillState, setMerchantDrillState] = useState({ level: 'merchant', merchant: null, category: null });
  const [merchantViewMode, setMerchantViewMode] = useState('value');
  const [categoryDrillViewMode, setCategoryDrillViewMode] = useState('value');
  const [timeGranularity, setTimeGranularity] = useState('week');
  const [selectedTimelineYear, setSelectedTimelineYear] = useState(null);
  const [selectedTimelineMonth, setSelectedTimelineMonth] = useState(null);
  const [selectedTrendItem, setSelectedTrendItem] = useState(null);
  const [categoryPieCategory, setCategoryPieCategory] = useState(null);
  const [showAllMerchants, setShowAllMerchants] = useState(false);
  const manualTimelineMonthRef = useRef(null);

  const buildManualMonthKey = useCallback(
    (granularity, year) => `${granularity}:${year ?? 'all'}`,
    []
  );

  const clearManualMonthSelection = useCallback(() => {
    manualTimelineMonthRef.current = null;
  }, []);


  const handleDelete = async (receiptId) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) {
        return;
    }
    const { error } = await supabase.from('receipts').delete().eq('id', receiptId);
    if (error) {
        alert('Failed to delete receipt.');
        console.error(error);
    } else {
        setReceipts(receipts.filter(r => r.id !== receiptId));
    }
  };

  const handleEdit = (receipt) => {
      sessionStorage.setItem('edit-receipt-data', JSON.stringify(receipt));
      navigate('/scan?edit=true');
  };

  useEffect(() => {
    let isMounted = true;

    const fetchReceipts = async () => {
      setIsLoading(true);
      try {
        if (!user) {
          if (isMounted) setReceipts([]);
          return;
        }

        const { data, error } = await supabase
          .from('v_receipts_enriched')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: true });

        if (error) throw error;
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

    if (!authLoading) {
      fetchReceipts();
    }

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

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

      const rawDate =
        receipt.receipt_date ||
        receipt.transaction_date ||
        receipt.date ||
        receipt.Date ||
        null;
      let parsedDate = null;
      if (rawDate) {
        try {
          parsedDate = parseISO(String(rawDate));
        } catch {
          parsedDate = new Date(rawDate);
        }
      }
      const isValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());

      return {
        ...receipt,
        line_items: items,
        total_amount: Number(receipt.total_amount) > 0 ? Number(receipt.total_amount) : itemsTotal,
        dateObj: isValidDate ? parsedDate : null,
        itemsTotal,
      };
    });
  }, [receipts]);


const buildAnalytics = (processedReceipts, referenceDate = new Date()) => {
    const now = referenceDate ?? new Date();
    const currentYearStart = startOfYear(now);
    const previousYearStart = startOfYear(subYears(now, 1));
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const currentQuarterStart = startOfQuarter(now);
    const previousQuarterStart = startOfQuarter(subMonths(now, 3));
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const currentDayStart = startOfDay(now);
    const previousDayStart = startOfDay(subDays(now, 1));

    const currentYearStartTime = currentYearStart.getTime();
    const previousYearStartTime = previousYearStart.getTime();
    const currentMonthStartTime = currentMonthStart.getTime();
    const previousMonthStartTime = previousMonthStart.getTime();
    const currentQuarterStartTime = currentQuarterStart.getTime();
    const previousQuarterStartTime = previousQuarterStart.getTime();
    const currentWeekStartTime = currentWeekStart.getTime();
    const previousWeekStartTime = previousWeekStart.getTime();
    const currentDayStartTime = currentDayStart.getTime();
    const previousDayStartTime = previousDayStart.getTime();

    const timeframeTotals = {
      year: { current: 0, previous: 0 },
      month: { current: 0, previous: 0 },
      quarter: { current: 0, previous: 0 },
      week: { current: 0, previous: 0 },
      day: { current: 0, previous: 0 },
    };

    if (!processedReceipts.length) {
      return {
        timelineSeries: {
          day: [],
          week: [],
          month: [],
          quarter: [],
          year: [],
        },
        monthlySeries: [],
        categoryHierarchy: [],
        merchantSeries: [],
        merchantDrilldown: { merchants: [], details: {} },
        weekdaySeries: [],
        categoryTimeline: null,
        categoryTimelineByFrame: {
          day: { categories: [], entries: [] },
          week: { categories: [], entries: [] },
          month: { categories: [], entries: [] },
          quarter: { categories: [], entries: [] },
          year: { categories: [], entries: [] },
        },
        categoryDetails: {},
        categoryNames: [],
        itemTotals: [],
        itemPriceTrends: [],
        basketComposition: [],
        itemTotalsByGranularity: {
          day: [],
          week: [],
          month: [],
          quarter: [],
          year: [],
        },
        basketByGranularity: {
          day: [],
          week: [],
          month: [],
          quarter: [],
          year: [],
        },
        categoryTreemap: [],
        storeTypeTree: [],
        stats: null,
        timeframeInsights: timeframeTotals,
      };
    }

    const granularityConfigs = {
      day: {
        startFn: (date) => startOfDay(date),
        periodFormatter: (date) => format(date, 'yyyy-MM-dd'),
        labelFormatter: (date) => format(date, 'MMM d'),
      },
      week: {
        startFn: (date) => startOfWeek(date, { weekStartsOn: 1 }),
        periodFormatter: (date) => format(date, 'yyyy-MM-dd'),
        labelFormatter: (date) => format(date, 'MMM d'),
      },
      month: {
        startFn: (date) => startOfMonth(date),
        periodFormatter: (date) => format(date, 'yyyy-MM'),
        labelFormatter: (date) => format(date, 'MMM yy'),
      },
      quarter: {
        startFn: (date) => startOfQuarter(date),
        periodFormatter: (date) => format(date, "yyyy-'Q'Q"),
        labelFormatter: (_date, period) => period,
      },
      year: {
        startFn: (date) => startOfYear(date),
        periodFormatter: (date) => format(date, 'yyyy'),
        labelFormatter: (_date, period) => period,
      },
    };

    const granularityKeys = Object.keys(granularityConfigs);

    const timelineTotals = granularityKeys.reduce((acc, key) => {
      acc[key] = new Map();
      return acc;
    }, {});

    const categoryTimelineTotals = granularityKeys.reduce((acc, key) => {
      acc[key] = new Map();
      return acc;
    }, {});

    const healthyKeywords = [
      'fruit',
      'vegetable',
      'veggie',
      'produce',
      'salad',
      'grain',
      'whole',
      'protein',
      'meat',
      'fish',
      'seafood',
      'egg',
      'dairy',
      'yoghurt',
      'yogurt',
      'milk',
      'nut',
      'seed',
      'legume',
      'bean',
    ];
    const snackKeywords = [
      'snack',
      'chips',
      'crisps',
      'sweet',
      'candy',
      'chocolate',
      'dessert',
      'cookie',
      'biscuit',
      'cake',
      'pastry',
      'cracker',
    ];
    const alcoholKeywords = [
      'alcohol',
      'beer',
      'wine',
      'spirit',
      'vodka',
      'whisky',
      'whiskey',
      'rum',
      'gin',
      'cider',
      'lager',
      'liqueur',
    ];

    const classifyBasketCategory = (mainCategory, subCategory, itemName) => {
      const combined = `${mainCategory || ''} ${subCategory || ''} ${itemName || ''}`.toLowerCase();
      if (alcoholKeywords.some((keyword) => combined.includes(keyword))) return 'alcohol';
      if (snackKeywords.some((keyword) => combined.includes(keyword))) return 'snacks';
      if (healthyKeywords.some((keyword) => combined.includes(keyword))) return 'healthy';
      return 'other';
    };

    const itemPriceHistory = new Map();
    const categoryMap = new Map();
    const merchantMap = new Map();
    const merchantDrilldownMap = new Map();
    const weekdayTotals = new Array(7).fill(0);
    const itemTotalsMap = new Map(); // item name -> total spend
    const itemTotalsByGranularityMaps = {
      day: new Map(),
      week: new Map(),
      month: new Map(),
      quarter: new Map(),
      year: new Map(),
    };
    const basketByGranularityMaps = {
      day: new Map(),
      week: new Map(),
      month: new Map(),
      quarter: new Map(),
      year: new Map(),
    };

    const ensureBasketBucket = (granularity, key, sortKey) => {
      const map = basketByGranularityMaps[granularity];
      if (!map.has(key)) {
        map.set(key, {
          period: key,
          healthy: 0,
          snacks: 0,
          alcohol: 0,
          other: 0,
          sortKey,
        });
      }
      const bucket = map.get(key);
      if (sortKey < bucket.sortKey) {
        bucket.sortKey = sortKey;
      }
      return bucket;
    };


    const getBasketKey = (granularity, dateObj) => {
      switch (granularity) {
        case 'day': {
          const period = format(dateObj, 'yyyy-MM-dd');
          return { period, sortKey: startOfDay(dateObj).getTime() };
        }
        case 'week': {
          const dayOfMonth = dateObj.getDate();
          const weekIndex = Math.min(4, Math.ceil(dayOfMonth / 7));
          const period = `${format(dateObj, 'yyyy-MM')}-W${weekIndex}`;
          const bucketStartDay = (weekIndex - 1) * 7 + 1;
          const sortDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), bucketStartDay);
          return { period, sortKey: sortDate.getTime() };
        }
        case 'month': {
          const period = format(dateObj, 'yyyy-MM');
          return { period, sortKey: startOfMonth(dateObj).getTime() };
        }
        case 'quarter': {
          const quarter = Math.floor(dateObj.getMonth() / 3) + 1;
          const period = `${format(dateObj, 'yyyy')}-Q${quarter}`;
          return { period, sortKey: startOfQuarter(dateObj).getTime() };
        }
        case 'year': {
          const period = format(dateObj, 'yyyy');
          return { period, sortKey: startOfYear(dateObj).getTime() };
        }
        default:
          return null;
      }
    };

    let totalSpent = 0;
    let highestReceipt = null;
    let thisMonthReceiptCount = 0;

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
          thisMonthReceiptCount += 1;
        } else if (time >= previousMonthStartTime && time < currentMonthStartTime) {
          timeframeTotals.month.previous += receiptTotal;
        }

        if (time >= currentQuarterStartTime) {
          timeframeTotals.quarter.current += receiptTotal;
        } else if (time >= previousQuarterStartTime && time < currentQuarterStartTime) {
          timeframeTotals.quarter.previous += receiptTotal;
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

        const weekdayIndex = receipt.dateObj.getDay();
        weekdayTotals[weekdayIndex] += receiptTotal;

        Object.entries(granularityConfigs).forEach(([granularity, cfg]) => {
          const baseDate = cfg.startFn(receipt.dateObj);
          const sortKey = baseDate.getTime();
          const period = cfg.periodFormatter(baseDate);
          const existing =
            timelineTotals[granularity].get(sortKey) ||
            {
              period,
              total: 0,
              sortKey,
              date: baseDate,
            };
          existing.total += receiptTotal;
          timelineTotals[granularity].set(sortKey, existing);
        });
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

        const mainCategory =
          formatCategoryLabel(item.main_category || item.Category || 'Other') || 'Other';
        const subCategory =
          formatCategoryLabel(item.sub_category || item.SubCategory || 'Misc') || 'Misc';

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

        if (receipt.dateObj && price > 0) {
          const dateKey = format(receipt.dateObj, 'yyyy-MM-dd');
          if (!itemPriceHistory.has(itemKey)) {
            itemPriceHistory.set(itemKey, new Map());
          }
          const historyMap = itemPriceHistory.get(itemKey);
          if (!historyMap.has(dateKey)) {
            historyMap.set(dateKey, { totalPrice: 0, count: 0 });
          }
          const historyEntry = historyMap.get(dateKey);
          historyEntry.totalPrice += price;
          historyEntry.count += 1;
        }

        const basketCategory = classifyBasketCategory(mainCategory, subCategory, itemName);

        if (receipt.dateObj) {
          const time = receipt.dateObj.getTime();
          if (time >= currentDayStartTime) {
            const map = itemTotalsByGranularityMaps.day;
            map.set(itemKey, (map.get(itemKey) || 0) + lineTotal);
          }
          if (time >= currentWeekStartTime) {
            const map = itemTotalsByGranularityMaps.week;
            map.set(itemKey, (map.get(itemKey) || 0) + lineTotal);
          }
          if (time >= currentMonthStartTime) {
            const map = itemTotalsByGranularityMaps.month;
            map.set(itemKey, (map.get(itemKey) || 0) + lineTotal);
          }
          if (time >= currentQuarterStartTime) {
            const map = itemTotalsByGranularityMaps.quarter;
            map.set(itemKey, (map.get(itemKey) || 0) + lineTotal);
          }
          if (time >= currentYearStartTime) {
            const map = itemTotalsByGranularityMaps.year;
            map.set(itemKey, (map.get(itemKey) || 0) + lineTotal);
          }

          periodGranularities.forEach((granularity) => {
            const info = getBasketKey(granularity, receipt.dateObj);
            if (!info) return;
            const record = ensureBasketBucket(granularity, info.period, info.sortKey || 0);
            record[basketCategory] += lineTotal;
          });
        }

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
          Object.entries(granularityConfigs).forEach(([granularity, cfg]) => {
            const baseDate = cfg.startFn(receipt.dateObj);
            const sortKey = baseDate.getTime();
            const period = cfg.periodFormatter(baseDate);
            if (!categoryTimelineTotals[granularity].has(sortKey)) {
              categoryTimelineTotals[granularity].set(sortKey, {
                period,
                sortKey,
                date: baseDate,
                totals: new Map(),
              });
            }
            const entry = categoryTimelineTotals[granularity].get(sortKey);
            entry.totals.set(mainCategory, (entry.totals.get(mainCategory) || 0) + lineTotal);
          });
        }
      });
    });

    const timelineSeries = granularityKeys.reduce((acc, key) => {
      const cfg = granularityConfigs[key];
      const entries = Array.from(timelineTotals[key].values())
        .sort((a, b) => a.sortKey - b.sortKey)
        .map(({ period, total, sortKey, date }) => {
          const baseDate =
            date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date(sortKey);
          const month = baseDate.getMonth();
          return {
            period,
            total: roundToTwo(total),
            sortKey,
            date: baseDate,
            year: baseDate.getFullYear(),
            month,
            quarter: Math.floor(month / 3) + 1,
            chartLabel: cfg.labelFormatter(baseDate, period),
          };
        });
      acc[key] = entries;
      return acc;
    }, {});

    const monthlySeries = timelineSeries.month || [];

    const itemPriceTrends = Array.from(itemPriceHistory.entries())
      .map(([itemName, historyMap]) => {
        const entries = Array.from(historyMap.entries())
          .map(([dateKey, stats]) => {
            const unitPrice =
              stats.count > 0 ? roundToTwo(stats.totalPrice / stats.count) : 0;
            const sortKey = new Date(dateKey).getTime();
            return {
              date: dateKey,
              unit_price: unitPrice,
              sortKey: Number.isFinite(sortKey) ? sortKey : 0,
            };
          })
          .filter((entry) => entry.unit_price > 0)
          .sort((a, b) => a.sortKey - b.sortKey)
          .map(({ sortKey, ...rest }) => rest);
        return {
          itemName,
          data: entries,
        };
      })
      .filter((entry) => entry.data.length >= 2);

    const basketByGranularity = Object.fromEntries(
      Object.entries(basketByGranularityMaps).map(([granularity, map]) => {
        const entries = Array.from(map.values())
          .sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0))
          .map(({ sortKey, ...rest }) => ({
            ...rest,
            healthy: roundToTwo(rest.healthy),
            snacks: roundToTwo(rest.snacks),
            alcohol: roundToTwo(rest.alcohol),
            other: roundToTwo(rest.other),
          }));
        return [granularity, entries];
      })
    );

    const basketComposition = basketByGranularity.month || [];

    const itemTotalsByGranularity = Object.fromEntries(
      Object.entries(itemTotalsByGranularityMaps).map(([granularity, map]) => {
        const arr = Array.from(map.entries())
          .map(([name, total]) => ({ name, value: roundToTwo(total) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 12);
        return [granularity, arr];
      })
    );

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

    const aggregateItemsByName = (items = [], limit = 8) => {
      const grouped = new Map();
      items.forEach((item) => {
        if (!item) return;
        const rawName = (item.name || '').trim() || 'Line item';
        const key = rawName.toLowerCase();
        const total = Number(item.total || 0);
        if (!Number.isFinite(total) || total <= 0) return;
        if (!grouped.has(key)) {
          grouped.set(key, { name: rawName, value: 0 });
        }
        const entry = grouped.get(key);
        entry.value += total;
      });
      return Array.from(grouped.values())
        .map(({ name, value }) => ({
          name,
          value: roundToTwo(value),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    };

    const categoryTreemap = categoryHierarchy
      .map((category) => {
        const details = categoryDetails[category.name];
        const subCategories = details?.subCategories || [];
        return {
          name: category.name,
          value: roundToTwo(details?.total ?? category.value ?? 0),
          children: subCategories
            .map((sub) => ({
              name: sub.name,
              value: roundToTwo(sub.total),
              children: aggregateItemsByName(sub.items, 8).map((itemEntry) => ({
                name: truncateLabel(itemEntry.name, 28),
                fullName: itemEntry.name,
                value: roundToTwo(itemEntry.value),
              })),
            }))
            .filter((sub) => sub.value > 0),
        };
      })
      .filter((entry) => entry.value > 0);

    const storeTypeTree = categoryHierarchy
      .map((category) => {
        const details = categoryDetails[category.name];
        const subCategories = details?.subCategories || [];
        return {
          name: category.name,
          fullName: category.name,
          value: roundToTwo(details?.total ?? category.value ?? 0),
          children: subCategories
            .map((sub) => ({
              name: sub.name,
              fullName: sub.name,
              value: roundToTwo(sub.total),
              children: aggregateItemsByName(sub.items, 5).map((itemEntry) => ({
                name: truncateLabel(itemEntry.name, 24),
                fullName: itemEntry.name,
                value: itemEntry.value,
              })),
            }))
            .filter((sub) => sub.value > 0),
        };
      })
      .filter((entry) => entry.value > 0);

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

    const categoryTimelineByFrame = granularityKeys.reduce((acc, key) => {
      const cfg = granularityConfigs[key];
      const entries = Array.from(categoryTimelineTotals[key].values()).sort((a, b) => a.sortKey - b.sortKey);
      if (!entries.length) {
        acc[key] = { categories: [], entries: [] };
        return acc;
      }

      const categories = Array.from(
        entries.reduce((set, entry) => {
          entry.totals.forEach((_, category) => set.add(category));
          return set;
        }, new Set())
      );

      const enrichedEntries = entries.map((entry) => {
        const baseDate =
          entry.date instanceof Date && !Number.isNaN(entry.date.getTime())
            ? entry.date
            : new Date(entry.sortKey);
        const month = baseDate.getMonth();
        return {
          ...entry,
          chartLabel: cfg.labelFormatter(baseDate, entry.period),
          year: baseDate.getFullYear(),
          month,
          quarter: Math.floor(month / 3) + 1,
          date: baseDate,
        };
      });

      acc[key] = { categories, entries: enrichedEntries };
      return acc;
    }, {});

    const categoryTimeline = (() => {
      const base = categoryTimelineByFrame.month;
      if (!base || !base.categories.length) return null;
      const source = [
        ['label', ...base.categories],
        ...base.entries.map((entry) => [
          entry.chartLabel,
          ...base.categories.map((category) => roundToTwo(entry.totals.get(category) || 0)),
        ]),
      ];
      return { categories: base.categories, source };
    })();

    const monthOverMonth =
      monthlySeries.length >= 2
        ? (() => {
            const last = monthlySeries[monthlySeries.length - 1];
            const prev = monthlySeries[monthlySeries.length - 2];
            if (prev.total === 0 && last.total > 0) return Infinity;
            if (prev.total === 0) return 0;
            return ((last.total - prev.total) / prev.total) * 100;
          })()
        : null;

    const busiestDay = weekdaySeries.reduce((best, current) => {
      if (!best || current.value > best.value) return current;
      return best;
    }, null);

    const itemTotals = Array.from(itemTotalsMap.entries())
      .map(([name, total]) => ({
        name,
        value: roundToTwo(total),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    return {
      timelineSeries,
      categoryTimelineByFrame,
      monthlySeries,
      categoryHierarchy,
      merchantSeries,
      merchantDrilldown,
      weekdaySeries,
      categoryTimeline,
      categoryDetails,
      categoryNames,
      itemTotals,
      categoryTreemap,
      storeTypeTree,
      itemTotalsByGranularity,
      itemPriceTrends,
      basketComposition,
      basketByGranularity,
      timeframeInsights: timeframeTotals,
      stats: {
        totalReceipts: processedReceipts.length,
        totalSpent,
        avgPerReceipt: processedReceipts.length ? totalSpent / processedReceipts.length : 0,
        monthOverMonth,
        thisMonthSpent: timeframeTotals.month.current,
        thisMonthCount: thisMonthReceiptCount,
        topCategory: categoryHierarchy[0]?.name || null,
        topMerchant: merchantSeries[0] || null,
        busiestDay,
        highestReceipt,
      },
    };
  
};

  const referenceDate = useMemo(() => new Date(), []);
  const overallAnalytics = useMemo(
    () => buildAnalytics(processedReceipts, referenceDate),
    [processedReceipts, referenceDate]
  );

  const timelineSeriesForGranularity =
    overallAnalytics.timelineSeries?.[timeGranularity] || [];
  const supportsYearSelection = timeGranularity !== 'year';
  const requiresMonthSelection = timeGranularity === 'day' || timeGranularity === 'week' || timeGranularity === 'month';

  const timelineYearOptions = useMemo(() => {
    if (!supportsYearSelection) return [];
    const years = Array.from(
      new Set(
        timelineSeriesForGranularity
          .map((item) => item.year)
          .filter((year) => Number.isFinite(year))
      )
    ).sort((a, b) => a - b);
    return years.map((year) => ({ value: year, label: String(year) }));
  }, [timelineSeriesForGranularity, supportsYearSelection]);

  const timelineMonthOptions = useMemo(() => {
    if (!requiresMonthSelection || selectedTimelineYear == null) return [];
    const months = Array.from(
      new Set(
        timelineSeriesForGranularity
          .filter((item) => item.year === selectedTimelineYear)
          .map((item) => item.month)
          .filter((month) => Number.isFinite(month))
      )
    ).sort((a, b) => a - b);
    return months.map((month) => ({
      value: month,
      label: format(new Date(selectedTimelineYear, month, 1), 'MMM'),
    }));
  }, [timelineSeriesForGranularity, requiresMonthSelection, selectedTimelineYear]);

  const handleGranularityChange = useCallback(
    (value) => {
      clearManualMonthSelection();
      setTimeGranularity(value);
    },
    [clearManualMonthSelection]
  );

  const handleTimelineYearChange = useCallback(
    (value) => {
      clearManualMonthSelection();
      setSelectedTimelineYear(value);
    },
    [clearManualMonthSelection]
  );

  const handleTimelineMonthChange = useCallback(
    (value) => {
      if (value === null || value === undefined) {
        clearManualMonthSelection();
      } else {
        manualTimelineMonthRef.current = buildManualMonthKey(timeGranularity, selectedTimelineYear);
      }
      setSelectedTimelineMonth(value);
    },
    [buildManualMonthKey, clearManualMonthSelection, selectedTimelineYear, timeGranularity]
  );

  const sharedTimeframeControlProps = {
    timeGranularity,
    onGranularityChange: handleGranularityChange,
    supportsYearSelection,
    requiresMonthSelection,
    yearOptions: timelineYearOptions,
    monthOptions: timelineMonthOptions,
    selectedYear: selectedTimelineYear,
    selectedMonth: selectedTimelineMonth,
    onYearChange: handleTimelineYearChange,
    onMonthChange: handleTimelineMonthChange,
  };
  const filteredReceipts = useMemo(() => {
    if (!processedReceipts.length) return [];

    return processedReceipts.filter((receipt) => {
      if (!receipt?.dateObj) return false;
      const year = receipt.dateObj.getFullYear();
      const month = receipt.dateObj.getMonth();

      if (requiresMonthSelection) {
        if (selectedTimelineYear == null || selectedTimelineMonth == null) return false;
        return year === selectedTimelineYear && month === selectedTimelineMonth;
      }

      if (supportsYearSelection && selectedTimelineYear != null) {
        return year === selectedTimelineYear;
      }

      return true;
    });
  }, [
    processedReceipts,
    requiresMonthSelection,
    supportsYearSelection,
    selectedTimelineYear,
    selectedTimelineMonth,
  ]);

  const timeframeReferenceDate = useMemo(() => {
    if (requiresMonthSelection) {
      if (selectedTimelineYear != null && selectedTimelineMonth != null) {
        return new Date(selectedTimelineYear, selectedTimelineMonth, 15);
      }
      return referenceDate;
    }

    if (supportsYearSelection && selectedTimelineYear != null) {
      return new Date(selectedTimelineYear, 6, 15);
    }

    return referenceDate;
  }, [
    requiresMonthSelection,
    supportsYearSelection,
    selectedTimelineYear,
    selectedTimelineMonth,
    referenceDate,
  ]);

  const analytics = useMemo(
    () => buildAnalytics(filteredReceipts, timeframeReferenceDate),
    [filteredReceipts, timeframeReferenceDate]
  );

  const itemPriceTrendOptions = useMemo(
    () => (analytics.itemPriceTrends || []).sort((a, b) => b.data.length - a.data.length),
    [analytics.itemPriceTrends]
  );

  useEffect(() => {
    if (itemPriceTrendOptions.length === 0) {
      if (selectedTrendItem !== null) setSelectedTrendItem(null);
      return;
    }
    if (!selectedTrendItem || !itemPriceTrendOptions.some((option) => option.itemName === selectedTrendItem)) {
      setSelectedTrendItem(itemPriceTrendOptions[0].itemName);
    }
  }, [itemPriceTrendOptions, selectedTrendItem]);

  const activeItemPriceTrend = useMemo(
    () => itemPriceTrendOptions.find((option) => option.itemName === selectedTrendItem) || null,
    [itemPriceTrendOptions, selectedTrendItem]
  );

  const basketCompositionData = useMemo(
    () => analytics.basketByGranularity?.[timeGranularity] || [],
    [analytics.basketByGranularity, timeGranularity]
  );

  const categoryPieData = useMemo(() => {
    const categories = (analytics.categoryNames || [])
      .map((name) => ({
        name,
        value: roundToTwo(analytics.categoryDetails?.[name]?.total || 0),
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);

    const subCategories =
      categoryPieCategory && analytics.categoryDetails?.[categoryPieCategory]
        ? (analytics.categoryDetails[categoryPieCategory].subCategories || [])
            .map((sub) => ({
              name: sub.name,
              value: roundToTwo(sub.total || 0),
            }))
            .filter((entry) => entry.value > 0)
            .sort((a, b) => b.value - a.value)
        : [];

    return { categories, subCategories };
  }, [analytics.categoryNames, analytics.categoryDetails, categoryPieCategory]);

  useEffect(() => {
    const drill = analytics.merchantDrilldown;
    if (!drill) {
      if (merchantDrillState.level !== 'merchant') {
        setMerchantDrillState({ level: 'merchant', merchant: null, category: null });
      }
      return;
    }
    if (merchantDrillState.level === 'category' && !drill.details?.[merchantDrillState.merchant]) {
      setMerchantDrillState({ level: 'merchant', merchant: null, category: null });
    } else if (merchantDrillState.level === 'sub') {
      const merchantDetails = drill.details?.[merchantDrillState.merchant];
      if (!merchantDetails) {
        setMerchantDrillState({ level: 'merchant', merchant: null, category: null });
      } else if (!merchantDetails.categoryLookup?.[merchantDrillState.category]) {
        setMerchantDrillState({ level: 'category', merchant: merchantDrillState.merchant, category: null });
      }
    }
  }, [analytics.merchantDrilldown, merchantDrillState, setMerchantDrillState]);

  useEffect(() => {
    if (merchantDrillState.level !== 'merchant' && showAllMerchants) {
      setShowAllMerchants(false);
    }
  }, [merchantDrillState.level, showAllMerchants]);

  const merchantDrilldownData = useMemo(() => {
    const drill = analytics.merchantDrilldown;
    if (!drill || !Array.isArray(drill.merchants) || drill.merchants.length === 0) {
      return null;
    }

    const { level, merchant, category } = merchantDrillState;
    let rows = drill.merchants;
    let subtitle = 'Tap a merchant to explore its categories.';

    if (level !== 'merchant') {
      const merchantDetails = drill.details?.[merchant];
      if (!merchantDetails) {
        return {
          data: drill.merchants.map((entry) => ({
            name: entry.name,
            value: roundToTwo(entry.value),
          })),
          subtitle,
          level: 'merchant',
        };
      }

      if (level === 'category') {
        rows = merchantDetails.categories || [];
        subtitle = `Categories inside ${merchant}.`;
      } else if (level === 'sub') {
        const categoryDetails = merchantDetails.categoryLookup?.[category];
        rows = categoryDetails?.subCategories || [];
        subtitle = `Sub-categories in ${category} (${merchant}).`;
      }
    }

    const normalized = rows
      .map((row) => {
        const value = roundToTwo(row.value ?? row.total ?? 0);
        return { name: row.name, value };
      })
      .filter((row) => row.value > 0);

    const isMerchantLevel = level === 'merchant';
    const shouldShowAll = showAllMerchants && isMerchantLevel;
    const dataToShow = shouldShowAll ? normalized : normalized.slice(0, 10);

    const total = normalized.reduce((sum, row) => sum + row.value, 0);
    const data = dataToShow.map((row) => ({
      ...row,
      percent: total ? (row.value / total) * 100 : 0,
    }));

    return {
      data,
      subtitle,
      total,
      canShowMore: isMerchantLevel && normalized.length > 10,
      showingAllMerchants: shouldShowAll,
    };
  }, [analytics.merchantDrilldown, merchantDrillState, showAllMerchants]);

  useEffect(() => {
    if (!analytics.categoryNames.length) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setDrillLevel('main');
      if (categoryPieCategory !== null) setCategoryPieCategory(null);
      return;
    }
    if (selectedCategory && !analytics.categoryDetails?.[selectedCategory]) {
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setDrillLevel('main');
    }
  }, [analytics.categoryNames, analytics.categoryDetails, selectedCategory]);

  useEffect(() => {
    if (categoryPieCategory && !analytics.categoryDetails?.[categoryPieCategory]) {
      setCategoryPieCategory(null);
    }
  }, [categoryPieCategory, analytics.categoryDetails]);

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
    const series = overallAnalytics.timelineSeries?.[timeGranularity] || [];
    if (!series.length) {
      if (selectedTimelineYear !== null) setSelectedTimelineYear(null);
      if (selectedTimelineMonth !== null) {
        clearManualMonthSelection();
        setSelectedTimelineMonth(null);
      }
      return;
    }

    if (!supportsYearSelection) {
      if (selectedTimelineYear !== null) setSelectedTimelineYear(null);
      if (selectedTimelineMonth !== null) {
        clearManualMonthSelection();
        setSelectedTimelineMonth(null);
      }
      return;
    }

    const years = Array.from(
      new Set(
        series.map((item) => item.year).filter((year) => Number.isFinite(year))
      )
    ).sort((a, b) => a - b);

    if (!years.length) {
      if (selectedTimelineYear !== null) setSelectedTimelineYear(null);
      if (selectedTimelineMonth !== null) {
        clearManualMonthSelection();
        setSelectedTimelineMonth(null);
      }
      return;
    }

    const currentYear = referenceDate.getFullYear();
    let targetYear = selectedTimelineYear && years.includes(selectedTimelineYear)
      ? selectedTimelineYear
      : (years.includes(currentYear) ? currentYear : years[years.length - 1]);

    if (targetYear !== selectedTimelineYear) {
      clearManualMonthSelection();
      setSelectedTimelineYear(targetYear);
      return;
    }

    if (!requiresMonthSelection) {
      if (selectedTimelineMonth !== null) {
        clearManualMonthSelection();
        setSelectedTimelineMonth(null);
      }
      return;
    }

    const months = Array.from(
      new Set(
        series
          .filter((item) => item.year === targetYear)
          .map((item) => item.month)
          .filter((month) => Number.isFinite(month))
      )
    ).sort((a, b) => a - b);

    if (!months.length) {
      if (selectedTimelineMonth !== null) {
        clearManualMonthSelection();
        setSelectedTimelineMonth(null);
      }
      return;
    }

    const manualKey = manualTimelineMonthRef.current;
    const currentKey = buildManualMonthKey(timeGranularity, targetYear);
    const hasManualSelection =
      manualKey && manualKey === currentKey && selectedTimelineMonth !== null;

    if (hasManualSelection) {
      if (!months.includes(selectedTimelineMonth)) {
        clearManualMonthSelection();
      } else {
        return;
      }
    }

    const currentMonth = referenceDate.getMonth();
    let targetMonth = months.includes(currentMonth)
      ? currentMonth
      : months[months.length - 1];

    if (targetMonth !== selectedTimelineMonth) {
      clearManualMonthSelection();
      setSelectedTimelineMonth(targetMonth);
    }
  }, [
    overallAnalytics.timelineSeries,
    timeGranularity,
    selectedTimelineYear,
    selectedTimelineMonth,
    supportsYearSelection,
    requiresMonthSelection,
    referenceDate,
    buildManualMonthKey,
    clearManualMonthSelection,
  ]);

  const spendingTrendOption = useMemo(() => {
    const baseData = overallAnalytics.timelineSeries?.[timeGranularity] || [];
    if (!baseData.length) return null;

    let filteredData = baseData;

    if (requiresMonthSelection) {
      if (selectedTimelineYear == null || selectedTimelineMonth == null) {
        return null;
      }
      filteredData = baseData.filter(
        (entry) =>
          entry.year === selectedTimelineYear && entry.month === selectedTimelineMonth
      );
    } else if (supportsYearSelection && selectedTimelineYear != null) {
      filteredData = baseData.filter((entry) => entry.year === selectedTimelineYear);
    }

    if (!filteredData.length) return null;

    const gridLeft = isMobile ? '22%' : '32%';
    const barWidth = isMobile ? 20 : 30;
    const axisFont = isMobile ? 11 : 12;

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
        data: filteredData.map((item) => item.chartLabel),
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
          data: filteredData.map((item) => item.total),
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
  }, [
    overallAnalytics.timelineSeries,
    timeGranularity,
    supportsYearSelection,
    requiresMonthSelection,
    selectedTimelineYear,
    selectedTimelineMonth,
  ]);

  const stackedCategoryOption = useMemo(() => {
    const timeline = analytics.categoryTimelineByFrame?.[timeGranularity];
    if (!timeline || !timeline.categories.length) {
      return null;
    }

    let entries = timeline.entries;
    if (requiresMonthSelection) {
      if (selectedTimelineYear == null || selectedTimelineMonth == null) {
        return null;
      }
      entries = entries.filter(
        (entry) =>
          entry.year === selectedTimelineYear && entry.month === selectedTimelineMonth
      );
    } else if (supportsYearSelection && selectedTimelineYear != null) {
      entries = entries.filter((entry) => entry.year === selectedTimelineYear);
    }

    if (!entries.length) return null;

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
        show: false,
        top: 10,
        textStyle: { color: '#E2E8F0' },
      },
      grid: { left: '3%', right: '4%', bottom: '6%', top: 70, containLabel: true },
      dataset: {
        source: [
          ['label', ...timeline.categories],
          ...entries.map((entry) => [
            entry.chartLabel,
            ...timeline.categories.map((category) => roundToTwo(entry.totals.get(category) || 0)),
          ]),
        ],
      },
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
  }, [
    analytics.categoryTimelineByFrame,
    timeGranularity,
    requiresMonthSelection,
    supportsYearSelection,
    selectedTimelineYear,
    selectedTimelineMonth,
  ]);

  const subcategoryNightingaleOption = useMemo(() => {
    const categoryDetails = analytics.categoryDetails;
    if (!categoryDetails || !Object.keys(categoryDetails).length) return null;

    const totals = new Map();
    Object.values(categoryDetails).forEach((category) => {
      (category?.subCategories || []).forEach((sub) => {
        if (!sub?.name) return;
        totals.set(sub.name, (totals.get(sub.name) || 0) + Number(sub.total || 0));
      });
    });

    const entries = Array.from(totals.entries())
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    if (!entries.length) return null;

    const topEntries = entries.slice(0, 14);
    const data = topEntries.map(([name, value]) => ({
      name: truncateLabel(name, 20),
      fullName: name,
      value: Number(value.toFixed(2)),
    }));

    return {
      backgroundColor: 'transparent',
      color: [
        '#8B5CF6',
        '#22D3EE',
        '#34D399',
        '#F97316',
        '#F59E0B',
        '#EC4899',
        '#6366F1',
        '#0EA5E9',
        '#14B8A6',
        '#D946EF',
        '#F97316',
        '#FBBF24',
        '#38BDF8',
        '#A3E635',
      ],
      tooltip: {
        trigger: 'item',
        formatter: (params) =>
          `${params.data.fullName}<br/>Total: ${formatCurrency(params.value)}`,
      },
      legend: {
        show: false,
      },
      series: [
        {
          name: 'Total',
          type: 'pie',
          roseType: 'area',
          radius: ['15%', '70%'],
          center: ['50%', '50%'],
          startAngle: 90,
          clockwise: true,
          itemStyle: {
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(15,23,42,0.35)',
          },
          label: {
            color: '#E2E8F0',
            formatter: '{b}\n{c|{c}}',
            rich: {
              c: {
                color: '#CBD5F5',
                fontSize: 11,
              },
            },
          },
          labelLine: {
            smooth: true,
            length: 12,
            length2: 10,
            lineStyle: { color: 'rgba(203, 213, 225, 0.6)' },
          },
          data,
        },
      ],
    };
  }, [analytics.categoryDetails]);

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

    const totalValue = filteredEntries.reduce((sum, entry) => sum + entry.value, 0);
    const dataSeries = filteredEntries.map((entry, index) => {
      const percent = totalValue ? (entry.value / totalValue) * 100 : 0;
      const valueForChart = categoryDrillViewMode === 'percent' ? percent : entry.value;
      return {
        value: roundToTwo(valueForChart),
        name: displayLabels[index],
        raw: entry,
        rawValue: entry.value,
        percent,
        itemStyle: {
          color: palette[index % palette.length],
        },
      };
    });

    const reversedLabels = displayLabels.slice().reverse();
    const reversedSeries = dataSeries.slice().reverse();
    const gridLeft = isMobile ? '24%' : '32%';
    const barWidth = isMobile ? 20 : 30;
    const axisFont = isMobile ? 11 : 12;

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
          const valueLine =
            categoryDrillViewMode === 'percent'
              ? `${Number(first.value || 0).toFixed(1)}%`
              : formatCurrency(first.value);
          const lines = [`${label}: ${valueLine}`];
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
      grid: { left: gridLeft, right: '8%', top: 40, bottom: 16 },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: '#E2E8F0',
          formatter: (value) =>
            categoryDrillViewMode === 'percent' ? `${Number(value).toFixed(0)}%` : `£${value}`,
        },
        splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
      },
      yAxis: {
        type: 'category',
        data: reversedLabels,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#F8FAFC', fontSize: axisFont },
      },
      series: [
        {
          type: 'bar',
          data: reversedSeries,
          barWidth,
          barCategoryGap: '40%',
          label: {
            show: true,
            position: 'right',
            color: '#E2E8F0',
            formatter: ({ value }) =>
              categoryDrillViewMode === 'percent'
                ? `${Number(value || 0).toFixed(1)}%`
                : formatCurrency(value),
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
    isMobile,
    categoryDrillViewMode,
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

  const categoryDrillSegments = useMemo(() => {
    const segments = [
      {
        label: 'All categories',
        active: drillLevel === 'main',
        onClick:
          drillLevel === 'main'
            ? undefined
            : () => {
                setDrillLevel('main');
                setSelectedCategory(null);
                setSelectedSubCategory(null);
              },
      },
    ];
    if (drillLevel !== 'main' && selectedCategory) {
      segments.push({
        label: selectedCategory,
        active: drillLevel === 'sub',
        onClick:
          drillLevel === 'sub'
            ? undefined
            : () => {
                setDrillLevel('sub');
                setSelectedSubCategory(null);
              },
      });
    }
    if (drillLevel === 'item' && selectedSubCategory) {
      segments.push({
        label: selectedSubCategory,
        active: true,
      });
    }
    return segments;
  }, [drillLevel, selectedCategory, selectedSubCategory]);

  const categoryDrillControls = (
    <div className="flex flex-wrap items-center gap-2">
        <DrilldownControls
          segments={categoryDrillSegments}
          onBack={stepBack}
          canGoBack={drillLevel !== 'main'}
        />
        <ViewToggle mode={categoryDrillViewMode} onChange={setCategoryDrillViewMode} />
    </div>
  );

  const categoryDrillActions = (
    <div className="flex flex-wrap items-center gap-2 ml-auto">
      <TimeframeControls {...sharedTimeframeControlProps} />
    </div>
  );

  const merchantDescription = useMemo(() => {
    if (merchantDrillState.level === 'merchant') {
      return 'Start with your highest-spend merchants. Tap a bar to inspect its categories.';
    }
    if (merchantDrillState.level === 'category') {
      return `Categories inside ${merchantDrillState.merchant}. Tap to reveal its sub-categories.`;
    }
    return `Sub-categories inside ${merchantDrillState.category || 'selection'} at ${merchantDrillState.merchant}.`;
  }, [merchantDrillState]);

  const handleMerchantBarClick = useCallback(
    (name) => {
      if (!name) return;
      if (merchantDrillState.level === 'sub') return;
      if (merchantDrillState.level === 'merchant') {
        setMerchantDrillState({ level: 'category', merchant: name, category: null });
      } else if (merchantDrillState.level === 'category') {
        setMerchantDrillState({ level: 'sub', merchant: merchantDrillState.merchant, category: name });
      }
    },
    [merchantDrillState, setMerchantDrillState]
  );

  const handleMerchantBack = useCallback(() => {
    if (merchantDrillState.level === 'sub') {
      setMerchantDrillState({ level: 'category', merchant: merchantDrillState.merchant, category: null });
    } else if (merchantDrillState.level === 'category') {
      setMerchantDrillState({ level: 'merchant', merchant: null, category: null });
    }
  }, [merchantDrillState, setMerchantDrillState]);

  const merchantSegments = useMemo(() => {
    const segments = [
      {
        label: 'All merchants',
        active: merchantDrillState.level === 'merchant',
        onClick:
          merchantDrillState.level === 'merchant'
            ? undefined
            : () => setMerchantDrillState({ level: 'merchant', merchant: null, category: null }),
      },
    ];
    if (merchantDrillState.level !== 'merchant' && merchantDrillState.merchant) {
      segments.push({
        label: merchantDrillState.merchant,
        active: merchantDrillState.level === 'category',
        onClick:
          merchantDrillState.level === 'category'
            ? undefined
            : () => setMerchantDrillState({ level: 'category', merchant: merchantDrillState.merchant, category: null }),
      });
    }
    if (merchantDrillState.level === 'sub' && merchantDrillState.category) {
      segments.push({
        label: merchantDrillState.category,
        active: true,
      });
    }
    return segments;
  }, [merchantDrillState]);

  const merchantControls =
    merchantDrilldownData && merchantDrilldownData.data.length
      ? (
        <DrilldownControls
          segments={merchantSegments}
          onBack={handleMerchantBack}
          canGoBack={merchantDrillState.level !== 'merchant'}
        />
      )
      : null;

  const merchantActions =
    merchantDrilldownData && merchantDrilldownData.data.length ? (
      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle mode={merchantViewMode} onChange={setMerchantViewMode} />
        <TimeframeControls {...sharedTimeframeControlProps} />
      </div>
    ) : (
      <TimeframeControls {...sharedTimeframeControlProps} />
    );

  const merchantMetricKey = merchantViewMode === 'percent' ? 'percent' : 'value';
  const merchantXAxisFormatter = (value) =>
    merchantViewMode === 'percent' ? `${Number(value).toFixed(1)}%` : `£${Number(value).toLocaleString('en-GB')}`;

  const merchantChartContent =
    merchantDrilldownData && merchantDrilldownData.data.length ? (
      <div className="flex h-full flex-col">
        <div className="flex-1 min-h-0">
          <ReResponsiveContainer width="100%" height="100%">
            <ReBarChart
              data={merchantDrilldownData.data}
              layout="vertical"
              margin={{ top: 10, right: 16, left: 16, bottom: 4 }}
            >
              <ReXAxis
                type="number"
                domain={merchantViewMode === 'percent' ? [0, 100] : ['auto', 'auto']}
                tick={{ fill: '#CBD5F5', fontSize: 11 }}
                tickFormatter={merchantXAxisFormatter}
              />
              <ReYAxis
                type="category"
                dataKey="name"
                width={isMobile ? 64 : 120}
                tick={{ fill: '#F8FAFC', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ReTooltip content={<MerchantTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <ReBar
                dataKey={merchantMetricKey}
                radius={[0, 8, 8, 0]}
                onClick={({ name }) => handleMerchantBarClick(name)}
                cursor={merchantDrillState.level === 'sub' ? 'default' : 'pointer'}
              >
                {merchantDrilldownData.data.map((entry, idx) => (
                  <ReCell
                    key={entry.name}
                    fill={merchantBarPalette[idx % merchantBarPalette.length]}
                    stroke="rgba(15,23,42,0.4)"
                    strokeWidth={1}
                  />
                ))}
                <ReLabelList
                  dataKey={merchantMetricKey}
                  position="right"
                  formatter={(value, entry) =>
                    merchantViewMode === 'percent'
                      ? `${Number(value || entry?.payload?.percent || 0).toFixed(1)}%`
                      : formatCurrency(value)
                  }
                  className="text-xs fill-white"
                />
              </ReBar>
            </ReBarChart>
          </ReResponsiveContainer>
        </div>
        {merchantDrilldownData.canShowMore && (
          <div className="mt-4 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full border border-white/10 text-white hover:bg-white/10"
              onClick={() => setShowAllMerchants((prev) => !prev)}
              aria-label={merchantDrilldownData.showingAllMerchants ? 'Show top 10 merchants' : 'Show all merchants'}
            >
              {merchantDrilldownData.showingAllMerchants ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span className="sr-only">
                {merchantDrilldownData.showingAllMerchants ? 'Show top 10 merchants' : 'Show all merchants'}
              </span>
            </Button>
          </div>
        )}
      </div>
    ) : null;

  const categoryPieOption = useMemo(() => {
    const source = categoryPieCategory ? categoryPieData.subCategories : categoryPieData.categories;
    if (!source.length) return null;

    const total = source.reduce((sum, entry) => sum + entry.value, 0);
    const chartData = source.map((entry) => ({
      ...entry,
      percent: total ? (entry.value / total) * 100 : 0,
    }));

    return {
      backgroundColor: 'transparent',
      title: {
        text: categoryPieCategory ? `${categoryPieCategory}` : 'Spending by Category',
        left: 'center',
        top: 10,
        textStyle: { color: '#E2E8F0', fontSize: 14, fontWeight: 600 },
        subtext: categoryPieCategory
          ? 'Compare value and share before heading back'
          : 'Bars show spend, line shows share %',
        subtextStyle: { color: 'rgba(226,232,240,0.65)', fontSize: 11, fontWeight: 400 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params = []) => {
          if (!params.length) return '';
          const barPoint = params.find((p) => p.seriesType === 'bar');
          const linePoint = params.find((p) => p.seriesType === 'line');
          const parts = [];
          if (barPoint) {
            parts.push(`${barPoint.name}: ${formatCurrency(barPoint.value)}`);
          }
          if (linePoint) {
            parts.push(`Share: ${Number(linePoint.value || 0).toFixed(1)}%`);
          }
          return parts.join('<br/>');
        },
      },
      legend: {
        top: 10,
        textStyle: { color: '#E2E8F0', fontSize: 11 },
        data: ['Spend', 'Share %'],
      },
      grid: { left: '6%', right: '8%', bottom: 40, top: 80, containLabel: true },
      xAxis: {
        type: 'category',
        data: chartData.map((entry) => truncateLabel(entry.name, 24)),
        axisTick: { alignWithLabel: true },
        axisLabel: { color: '#E2E8F0', fontSize: 11, interval: 0 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Spend (£)',
          axisLabel: { color: '#E2E8F0', formatter: (value) => `£${value}` },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.15)' } },
        },
        {
          type: 'value',
          name: 'Share %',
          axisLabel: { color: '#E2E8F0', formatter: (value) => `${value}%` },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Spend',
          type: 'bar',
          barWidth: 26,
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: '#34d399',
          },
          data: chartData.map((entry) => entry.value),
        },
        {
          name: 'Share %',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2, color: '#f97316' },
          itemStyle: { color: '#f97316' },
          data: chartData.map((entry) => Number(entry.percent.toFixed(1))),
        },
      ],
    };
  }, [categoryPieCategory, categoryPieData]);

  const categoryPieEvents = useMemo(
    () => ({
      click: (params) => {
        const targetName = params?.name;
        if (!targetName) return;
        const hasSubCategories =
          analytics.categoryDetails?.[targetName]?.subCategories?.length > 0;
        if (!categoryPieCategory && hasSubCategories) {
          setCategoryPieCategory(targetName);
        }
      },
    }),
    [categoryPieCategory, analytics.categoryDetails]
  );

  const categoryPieActions = <TimeframeControls {...sharedTimeframeControlProps} />;

  const categoryPieDescription = (
    <div className="flex flex-wrap items-center gap-3">
      <span>
        Inspect how spend divides across categories, then drill into sub-categories to see where money concentrates.
      </span>
      {categoryPieCategory && (
        <button
          type="button"
          onClick={() => setCategoryPieCategory(null)}
          className="rounded-full border border-violet-300/40 bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-100 shadow-sm transition hover:bg-violet-500/30"
        >
          All categories
        </button>
      )}
    </div>
  );

  const insightHighlights = useMemo(() => {
    if (!overallAnalytics.stats) return [];
    const highlights = [];
    const { topCategory, topMerchant, monthOverMonth, busiestDay, highestReceipt } = overallAnalytics.stats;

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
  }, [overallAnalytics.stats]);

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen bg-[#050507] text-white font-sans">
      <AnimatedSection>
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white font-display">
            Insights & Analytics
          </h1>
          <p className="text-sm md:text-base text-white/70 max-w-3xl leading-relaxed">
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

      {overallAnalytics.stats && (
        <AnimatedSection delay={0.05}>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <StatsCard
              label="Total Spend Captured"
              value={overallAnalytics.stats.totalSpent || 0}
              helper={`Across ${overallAnalytics.stats.totalReceipts || 0} receipts`}
            />
            <StatsCard
              label="Average Per Receipt"
              value={overallAnalytics.stats.avgPerReceipt || 0}
              helper="Smarter batching keeps individual trips lower"
            />
            <StatsCard
              label="Top Category"
              value={overallAnalytics.stats.topCategory || '—'}
              helper="Based on captured line items"
            />
            <StatsCard
              label="Month-over-Month"
              value={
                overallAnalytics.stats.monthOverMonth == null
                  ? '—'
                  : overallAnalytics.stats.monthOverMonth === Infinity
                  ? 'New spend'
                  : `${overallAnalytics.stats.monthOverMonth > 0 ? '+' : ''}${overallAnalytics.stats.monthOverMonth.toFixed(1)}%`
              }
              helper="Change versus previous month"
            />
          </div>
        </AnimatedSection>
      )}

      {overallAnalytics.timeframeInsights && (
        <AnimatedSection delay={0.07}>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            <TimeframeCard
              label="This Month"
              current={overallAnalytics.timeframeInsights.month.current}
              previous={overallAnalytics.timeframeInsights.month.previous}
            />
            <TimeframeCard
              label="This Week"
              current={overallAnalytics.timeframeInsights.week.current}
              previous={overallAnalytics.timeframeInsights.week.previous}
            />
            <TimeframeCard
              label="Today"
              current={overallAnalytics.timeframeInsights.day.current}
              previous={overallAnalytics.timeframeInsights.day.previous}
            />
            <TimeframeCard
              label="Year to Date"
              current={overallAnalytics.timeframeInsights.year.current}
              previous={overallAnalytics.timeframeInsights.year.previous}
            />
          </div>
        </AnimatedSection>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 mt-8">
        <AnimatedSection delay={0.1}>
          <ChartCard
            title="Timeline Spend Trend"
            description="Pivot between day, week, month, quarter, or year totals to see how spending patterns evolve."
            option={spendingTrendOption}
            isLoading={isLoading}
            hasData={Boolean(spendingTrendOption)}
            height={320}
            actions={<TimeframeControls {...sharedTimeframeControlProps} />}
          />
        </AnimatedSection>
        <AnimatedSection delay={0.12}>
          <ChartCard
            title="Category Timeline"
            description="Compare how each category contributes to overall spend for the selected timeline granularity."
            option={stackedCategoryOption}
            isLoading={isLoading}
            hasData={Boolean(stackedCategoryOption)}
            emptyMessage="Capture receipts with line items to unlock category trends."
            height={320}
            actions={<TimeframeControls {...sharedTimeframeControlProps} />}
          />
        </AnimatedSection>
        <AnimatedSection delay={0.14}>
          <ChartCard
            title="Top Merchants"
            description={merchantDescription}
            customContent={merchantChartContent}
            isLoading={isLoading}
            hasData={Boolean(merchantDrilldownData?.data?.length)}
            height={320}
            controls={merchantControls}
            actions={merchantActions}
            emptyMessage="Scan more receipts to unlock merchant insights."
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
            actions={<TimeframeControls {...sharedTimeframeControlProps} />}
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
            controls={categoryDrillControls}
            actions={categoryDrillActions}
            height={300}
          />
          <ChartCard
            title="Sub-category Nightingale"
            description="A Nightingale rose chart showcasing which sub-categories dominate your overall spend."
            option={subcategoryNightingaleOption}
            isLoading={isLoading}
            hasData={Boolean(subcategoryNightingaleOption)}
            emptyMessage="Capture receipts with detailed line items to reveal sub-category spend."
            height={300}
            actions={<TimeframeControls {...sharedTimeframeControlProps} />}
          />
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.2}>
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white font-display">Item Price Trend</h3>
                <p className="text-xs text-white/70">
                  Track how the unit price for a frequent item is changing over time.
                </p>
              </div>
              <TimeframeControls {...sharedTimeframeControlProps}>
                {itemPriceTrendOptions.length > 1 && (
                  <select
                    value={selectedTrendItem ?? ''}
                    onChange={(event) => setSelectedTrendItem(event.target.value || null)}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  >
                    {itemPriceTrendOptions.map((option) => (
                      <option key={option.itemName} value={option.itemName} className="bg-slate-900 text-slate-100">
                        {truncateLabel(option.itemName, 32)}
                      </option>
                    ))}
                  </select>
                )}
              </TimeframeControls>
            </div>
            <ItemPriceTrendChart
              data={activeItemPriceTrend?.data || []}
              itemName={activeItemPriceTrend?.itemName || '—'}
            />
          </div>
          <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white font-display">Basket Composition</h3>
                <p className="text-xs text-white/70">
                  See how healthy, snack, and alcohol purchases contribute to each basket over time.
                </p>
              </div>
              <TimeframeControls {...sharedTimeframeControlProps} />
            </div>
            <BasketCompositionChart data={basketCompositionData} />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.22}>
        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">


          <div className="bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-white font-display">Key takeaways</h2>
              <p className="text-sm text-white/70 mt-2">
                A quick narrative summary distilled from your latest data points.
              </p>
            </div>
            {insightHighlights.length ? (
              <ul className="list-disc list-inside space-y-2 text-sm md:text-base text-white">
                {insightHighlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-white/70">
                Add more receipts to unlock personalised insights and recommendations.
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={0.24}>
        <div className="mt-10 space-y-4 bg-white/5 dark:bg-gray-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-lg font-semibold text-white font-display">All Receipts</h3>
            <TimeframeControls {...sharedTimeframeControlProps} />
          </div>
          <div className="border border-white/5 rounded-2xl overflow-hidden">
            <ReceiptsAnalyticsTable
              receipts={processedReceipts}
              isLoading={isLoading}
              showInsightsLink={false}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}
