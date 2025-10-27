import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateSafe } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, BarChart2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MerchantLogo from './ui/MerchantLogo';
import StoreType from './ui/StoreType';

const PAGE_SIZE = 5;

export default function ReceiptsAnalyticsTable({ receipts, isLoading, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);

  const sortedReceipts = useMemo(() => {
    let sortableItems = [...receipts];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [receipts, sortConfig]);

  const totalPages = Math.ceil(sortedReceipts.length / PAGE_SIZE);
  const paginatedReceipts = sortedReceipts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const SortableHeader = ({ sortKey, children, className }) => {
    const isSorted = sortConfig.key === sortKey;
    const icon = isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUp className="w-3 h-3 ml-1 text-gray-500" /> : <ChevronDown className="w-3 h-3 ml-1 text-gray-500" />) : <div className="w-4 h-4" />;
    return (
      <TableHead onClick={() => requestSort(sortKey)} className={`cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors ${className}`}>
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {children}
          {icon}
        </div>
      </TableHead>
    );
  };

  return (
    <Card className="font-fk-grotesk border-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-4 md:p-6">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Recent Receipts
          </CardTitle>
          <Link to={createPageUrl("Insights")}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm font-semibold text-vibrant-blue hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-800">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">View Insights</span>
            </Button>
          </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full border-collapse border border-gray-200/50 dark:border-gray-700/50">
            <TableHeader>
              <TableRow className="border-b-gray-200/50 dark:border-b-gray-700/50">
                <SortableHeader sortKey="merchant_name" className="pl-4 md:pl-6 border-r border-gray-200/50 dark:border-gray-700/50">Store</SortableHeader>
                <SortableHeader sortKey="transaction_date" className="border-r border-gray-200/50 dark:border-gray-700/50">Date</SortableHeader>
                <SortableHeader sortKey="category" className="text-center border-r border-gray-200/50 dark:border-gray-700/50">Type</SortableHeader>
                <SortableHeader sortKey="total_amount" className="text-right pr-4 md:pr-6">Total</SortableHeader>
                <TableHead className="pr-4 md:pr-6"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(PAGE_SIZE)].map((_, i) => (
                  <TableRow key={i} className="border-0">
                    <TableCell colSpan={5} className="p-2">
                      <div className="h-12 bg-gray-200/50 dark:bg-gray-800/50 rounded-md animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedReceipts.length > 0 ? (
                paginatedReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="group border-b border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                    <TableCell className="pl-4 md:pl-6 py-3 border-r border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <MerchantLogo merchantName={receipt.merchant_name} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{receipt.merchant_name}</span>
                          <div className="md:hidden mt-1">
                            <StoreType merchantName={receipt.merchant_name} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400 border-r border-gray-200/50 dark:border-gray-700/50">{formatDateSafe(receipt.transaction_date, "MMM d, yyyy")}</TableCell>
                    <TableCell className="border-r border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center justify-center">
                        <StoreType merchantName={receipt.merchant_name} />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-right text-sm text-gray-800 dark:text-gray-200 pr-4 md:pr-6">{receipt.total_amount?.toFixed(2)}</TableCell>
                    <TableCell className="text-right pr-4 md:pr-6">
                      <Button variant="ghost" size="icon" onClick={() => onDelete(receipt.id)} className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4 text-red-500/80 hover:text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-gray-500">
                    No receipts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-2 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="text-xs text-gray-500 px-2">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-8 h-8">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-8 h-8">
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}