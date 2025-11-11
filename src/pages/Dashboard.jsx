import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend
} from 'recharts';
import StatsGrid from '../components/StatsGrid';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { subDays, format, eachDayOfInterval } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// AI-themed color palette
const aiColor = "#8B5CF6"; // A nice violet
const aiColorMuted = "#6D28D9"; // A darker violet

// A modern, reusable chart wrapper with new styling
const ChartWrapper = ({ title, subtitle, controls, actions, children, isLoading }) => (
  <div className="bg-white/5 dark:bg-gray-900/60 rounded-3xl shadow-2xl backdrop-blur p-5 md:p-6 lg:p-8 h-[400px] flex flex-col border border-white/15 min-w-0 w-full">
    <div className="mb-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display font-semibold text-base md:text-lg text-gray-100">{title}</h2>
        {actions}
      </div>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
    </div>
    <div className="flex-grow min-h-0">
      {isLoading ? (
        <div className="h-full w-full bg-gray-700/50 animate-pulse rounded-lg"></div>
      ) : (
        children
      )}
    </div>
  </div>
);

// Custom Tooltip with new styling
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/70 backdrop-blur-md p-3 border border-gray-600 rounded-lg shadow-xl">
        <p className="label font-semibold text-gray-200 font-display text-sm">{label}</p>
        {payload.map((p, i) => (
            <p key={i} style={{ color: p.color || aiColor }} className="text-xs">{`${p.name}: £${p.value.toFixed(2)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Spending Trend Area Chart
const SpendingTrendChart = ({ data, isLoading }) => (
  <ChartWrapper title="Spending Trend" isLoading={isLoading}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={aiColor} stopOpacity={0.7}/>
            <stop offset="95%" stopColor={aiColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }} tickFormatter={(str) => format(new Date(str), 'dd/MM')} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }} tickFormatter={(value) => `£${value}`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="total" name="Total Spent" stroke={aiColor} strokeWidth={2} fill="url(#aiGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  </ChartWrapper>
);

// 2. Top Merchants Horizontal Bar Chart
const TopMerchantsChart = ({ data, isLoading }) => (
  <ChartWrapper title="Top Merchants" isLoading={isLoading}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 10, right: 24, left: 80, bottom: 10 }}
        barCategoryGap={18}
      >
        <XAxis
          type="number"
          tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }}
          tickFormatter={(value) => `£${value}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fill: '#D1D5DB', fontSize: 11, fontFamily: 'Inter' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
        <Bar
          dataKey="total"
          name="Total Spent"
          radius={[0, 4, 4, 0]}
          barSize={22}
          stroke="rgba(15,23,42,0.9)"
          strokeWidth={1}
          background={{ fill: 'rgba(15,23,42,0.25)', radius: [0, 4, 4, 0] }}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index % 2 === 0 ? aiColor : aiColorMuted}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={1.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </ChartWrapper>
);

// 3. Hierarchical Category Chart (Restyled)
const HierarchicalCategoryChart = ({ data, isLoading, onBarClick, onBackClick, chartState }) => {
  const { level, selectedCategory } = chartState;

  const getTitle = () => {
    if (level === 'item') return `Items in ${chartState.selectedSubCategory}`;
    if (level === 'sub') return `Sub-categories of ${selectedCategory}`;
    return 'Expenses by Category';
  };

  return (
    <ChartWrapper title={getTitle()} isLoading={isLoading}>
        {level !== 'main' && (
          <div className="flex justify-end mb-2">
            <button
              onClick={onBackClick}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Inter' }} tickFormatter={(value) => `£${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: level !== 'item' ? 'rgba(139, 92, 246, 0.1)' : 'none' }} />
                <Bar dataKey="total" name="Total Spent" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={aiColor}
                            cursor={level !== 'item' ? 'pointer' : 'default'}
                            onClick={() => { if (level !== 'item') onBarClick(entry.name); }}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default function Dashboard() {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState({ totalReceipts: 0, totalSpent: 0, thisMonthSpent: 0, thisMonthCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { fetchWithAuth } = useAuth();
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const [chartState, setChartState] = useState({
    level: 'main', // 'main', 'sub', or 'item'
    selectedCategory: null,
    selectedSubCategory: null,
  });

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: new Date(value) }));
  };

  const filteredReceipts = useMemo(() => receipts.filter(r => {
      const receiptDate = new Date(r.transaction_date);
      return receiptDate >= dateRange.start && receiptDate <= dateRange.end;
  }), [receipts, dateRange]);

  // Data processing for all charts
  const { hierarchicalData, spendingTrendData, topMerchantsData } = useMemo(() => {
    const categoryTotals = {}, subCategoryTotals = {}, itemTotals = {};
    const dailySpending = {}, merchantTotals = {};

    const interval = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    interval.forEach(day => dailySpending[format(day, 'yyyy-MM-dd')] = 0);

    filteredReceipts.forEach(receipt => {
      const receiptDate = new Date(receipt.transaction_date);
      const formattedDate = format(receiptDate, 'yyyy-MM-dd');
      if(dailySpending[formattedDate] !== undefined) {
        dailySpending[formattedDate] += receipt.total_amount || 0;
      }

      merchantTotals[receipt.merchant_name] = (merchantTotals[receipt.merchant_name] || 0) + (receipt.total_amount || 0);

      (receipt.line_items || []).forEach(item => {
        const price = (item.price || 0) * (item.quantity || 1);
        const { main_category, sub_category, item: itemName } = item;
        if (main_category) {
          categoryTotals[main_category] = (categoryTotals[main_category] || 0) + price;
          if (sub_category) {
            if (!subCategoryTotals[main_category]) subCategoryTotals[main_category] = {};
            subCategoryTotals[main_category][sub_category] = (subCategoryTotals[main_category][sub_category] || 0) + price;
            if (itemName) {
              if (!itemTotals[main_category]) itemTotals[main_category] = {};
              if (!itemTotals[main_category][sub_category]) itemTotals[main_category][sub_category] = {};
              itemTotals[main_category][sub_category][itemName] = (itemTotals[main_category][sub_category][itemName] || 0) + price;
            }
          }
        }
      });
    });

    const formatForChart = (data) => Object.entries(data).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    
    let hierarchicalData;
    const { level, selectedCategory, selectedSubCategory } = chartState;
    if (level === 'item' && selectedCategory && selectedSubCategory) {
      hierarchicalData = formatForChart(itemTotals[selectedCategory]?.[selectedSubCategory] || {});
    } else if (level === 'sub' && selectedCategory) {
      hierarchicalData = formatForChart(subCategoryTotals[selectedCategory] || {});
    } else {
      hierarchicalData = formatForChart(categoryTotals);
    }

    const spendingTrendData = Object.entries(dailySpending).map(([date, total]) => ({ date, total })).sort((a,b) => new Date(a.date) - new Date(b.date));
    const topMerchantsData = formatForChart(merchantTotals).slice(0, 7).reverse();

    return { hierarchicalData, spendingTrendData, topMerchantsData };
  }, [filteredReceipts, chartState, dateRange]);

  const handleBarClick = (name) => {
    const { level } = chartState;
    if (level === 'main') setChartState({ level: 'sub', selectedCategory: name, selectedSubCategory: null });
    else if (level === 'sub') setChartState({ ...chartState, level: 'item', selectedSubCategory: name });
  };

  const handleBackClick = () => {
    const { level, selectedCategory } = chartState;
    if (level === 'item') setChartState({ level: 'sub', selectedCategory, selectedSubCategory: null });
    else if (level === 'sub') setChartState({ level: 'main', selectedCategory: null, selectedSubCategory: null });
  };

  const updateState = (updatedReceipts) => {
    setReceipts(updatedReceipts);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalSpent = 0, thisMonthSpent = 0, thisMonthCount = 0;
    updatedReceipts.forEach(r => {
      totalSpent += r.total_amount || 0;
      const receiptDate = new Date(r.transaction_date);
      if (receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear) {
        thisMonthSpent += r.total_amount || 0;
        thisMonthCount++;
      }
    });
    setStats({ totalReceipts: updatedReceipts.length, totalSpent, thisMonthSpent, thisMonthCount });
  }

  useEffect(() => {
    const fetchReceipts = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth('/api/receipts');
        if (!response.ok) {
          throw new Error('Failed to fetch receipts');
        }
        const data = await response.json();
        updateState(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipts();
  }, [fetchWithAuth]);

  

  return (
    <motion.div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-900 font-sans">
      <AnimatedSection>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-white">Analytics Dashboard</h1>
            <div className="flex flex-wrap items-center gap-3 bg-gray-800/50 p-3 rounded-2xl border border-gray-700 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
                  <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">From</label>
                  <input
                    type="date"
                    name="start"
                    value={format(dateRange.start, 'yyyy-MM-dd')}
                    onChange={handleDateChange}
                    className="bg-gray-700 text-gray-100 rounded-md px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-auto min-w-[150px]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
                  <label className="text-xs font-semibold tracking-widest text-gray-400 uppercase">To</label>
                  <input
                    type="date"
                    name="end"
                    value={format(dateRange.end, 'yyyy-MM-dd')}
                    onChange={handleDateChange}
                    className="bg-gray-700 text-gray-100 rounded-md px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-auto min-w-[150px]"
                  />
                </div>
            </div>
        </div>
      </AnimatedSection>
      
      <AnimatedSection delay={0.1}>
        <StatsGrid {...stats} isLoading={isLoading} />
      </AnimatedSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
        <SpendingTrendChart data={spendingTrendData} isLoading={isLoading} />
        <TopMerchantsChart data={topMerchantsData} isLoading={isLoading} />
        <div className="lg:col-span-2">
            <HierarchicalCategoryChart data={hierarchicalData} isLoading={isLoading} onBarClick={handleBarClick} onBackClick={handleBackClick} chartState={chartState} />
        </div>
      </div>

    </motion.div>
  );
}
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
            disabled={segment.active}
            className={`rounded-full px-2 py-0.5 transition ${
              segment.active ? 'bg-white/20 text-white cursor-default' : 'text-gray-400 hover:text-white'
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
