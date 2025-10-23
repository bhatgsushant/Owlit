import React, { useState, useEffect } from 'react';
import StatsGrid from '../components/StatsGrid';
import ReceiptsAnalyticsTable from '../components/ReceiptsAnalyticsTable';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to determine the most frequent category from line items
function getMostFrequentCategory(lineItems) {
  if (!lineItems || lineItems.length === 0) {
    return 'other';
  }

  const categoryCounts = lineItems.reduce((acc, item) => {
    const category = item.main_category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  if (Object.keys(categoryCounts).length === 0) {
    return 'other';
  }

  const mostFrequentCategory = Object.keys(categoryCounts).reduce((a, b) =>
    categoryCounts[a] > categoryCounts[b] ? a : b
  );

  return mostFrequentCategory;
}


export default function Dashboard() {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalSpent: 0,
    thisMonthSpent: 0,
    thisMonthCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading delay for demo purposes
    const timer = setTimeout(() => {
      try {
        const storedReceipts = JSON.parse(localStorage.getItem('receipts') || '[]');
        
        const receiptsWithCategory = storedReceipts.map(receipt => ({
          ...receipt,
          category: getMostFrequentCategory(receipt.line_items),
        }));

        setReceipts(receiptsWithCategory);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalSpent = 0;
        let thisMonthSpent = 0;
        let thisMonthCount = 0;

        receiptsWithCategory.forEach(receipt => {
          totalSpent += receipt.total_amount || 0;
          const receiptDate = new Date(receipt.transaction_date);
          if (receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear) {
            thisMonthSpent += receipt.total_amount || 0;
            thisMonthCount++;
          }
        });

        setStats({
          totalReceipts: receiptsWithCategory.length,
          totalSpent,
          thisMonthSpent,
          thisMonthCount,
        });
      } catch (error) {
        console.error("Failed to parse receipts from localStorage", error);
      } finally {
        setIsLoading(false);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight theme-text-primary">Dashboard</h1>
      
      <StatsGrid {...stats} isLoading={isLoading} />

      <ReceiptsAnalyticsTable receipts={receipts} isLoading={isLoading} />
    </div>
  );
}