import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend
} from 'recharts';
import StatsGrid from '../components/StatsGrid';
import ReceiptsAnalyticsTable from '../components/ReceiptsAnalyticsTable';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { subDays, format, eachDayOfInterval, isSameDay } from 'date-fns';
import { ArrowLeft } from 'lucide-react';

// A modern, reusable chart wrapper
const ChartWrapper = ({ title, children, isLoading }) => (
  <div className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg p-4 md:p-6 h-[400px] flex flex-col">
    <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h2>
    <div className="flex-grow">
      {isLoading ? (
        <div className="h-full w-full bg-gray-200 dark:bg-gray-700/50 animate-pulse rounded-lg"></div>
      ) : (
        children
      )}
    </div>
  </div>
);

// Custom Tooltip for a more modern feel
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/60 backdrop-blur-sm p-3 border border-gray-700 rounded-lg shadow-xl">
        <p className="label font-semibold text-gray-200">{label}</p>
        {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>{`${p.name}: £${p.value.toFixed(2)}`}</p>
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
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
        <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(str) => format(new Date(str), 'MMM d')} />
        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `£${value}`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="total" name="Total Spent" stroke="#10B981" strokeWidth={2} fill="url(#colorTotal)" />
      </AreaChart>
    </ResponsiveContainer>
  </ChartWrapper>
);

// 2. Top Merchants Horizontal Bar Chart
const TopMerchantsChart = ({ data, isLoading }) => (
    <ChartWrapper title="Top Merchants" isLoading={isLoading}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `£${value}`} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }} />
                <Bar dataKey="total" name="Total Spent" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#059669' : '#10B981'} />
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
        <div className="flex items-center mb-2 absolute top-6 left-6">
            {level !== 'main' && (
                <button onClick={onBackClick} className="p-1.5 rounded-full hover:bg-gray-700 transition-colors">
                    <ArrowLeft size={20} className="text-gray-300" />
                </button>
            )}
        </div>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(value) => `£${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: level !== 'item' ? 'rgba(128, 128, 128, 0.1)' : 'none' }} />
                <Bar dataKey="total" name="Total Spent" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill="#10B981"
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
    const topMerchantsData = formatForChart(merchantTotals).slice(0, 10).reverse();

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
    setIsLoading(true);
    setTimeout(() => {
      try {
        updateState(JSON.parse(localStorage.getItem('receipts') || '[]'));
      } catch (error) { console.error("Failed to parse receipts", error); }
      finally { setIsLoading(false); }
    }, 1000);
  }, []);

  const handleDeleteReceipt = (receiptId) => {
    const updatedReceipts = receipts.filter(r => r.id !== receiptId);
    localStorage.setItem('receipts', JSON.stringify(updatedReceipts));
    updateState(updatedReceipts);
  };

  return (
    <motion.div className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <AnimatedSection>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-800 dark:text-white">Analytics Dashboard</h1>
            <div className="flex items-center gap-2 md:gap-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">From:</label>
                <input type="date" name="start" value={format(dateRange.start, 'yyyy-MM-dd')} onChange={handleDateChange} className="bg-gray-100 dark:bg-gray-700 text-gray-200 rounded-md p-1.5 text-sm border-transparent focus:ring-2 focus:ring-green-500"/>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300">To:</label>
                <input type="date" name="end" value={format(dateRange.end, 'yyyy-MM-dd')} onChange={handleDateChange} className="bg-gray-100 dark:bg-gray-700 text-gray-200 rounded-md p-1.5 text-sm border-transparent focus:ring-2 focus:ring-green-500"/>
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

      <div className="mt-6 md:mt-8">
        <AnimatedSection delay={0.2}>
            <ReceiptsAnalyticsTable receipts={filteredReceipts} isLoading={isLoading} onDelete={handleDeleteReceipt} />
        </AnimatedSection>
      </div>
    </motion.div>
  );
}
