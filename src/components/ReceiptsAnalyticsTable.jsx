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
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { formatDateSafe } from '@/lib/utils';
import { ChevronUp, ChevronDown, List, Info, ChevronsLeft, ChevronsRight, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const categoryColors = {
  groceries: "bg-green-100 text-green-800 border-green-200",
  restaurants: "bg-red-100 text-red-800 border-red-200",
  gas: "bg-blue-100 text-blue-800 border-blue-200",
  retail: "bg-purple-100 text-purple-800 border-purple-200",
  pharmacy: "bg-pink-100 text-pink-800 border-pink-200",
  entertainment: "bg-yellow-100 text-yellow-800 border-yellow-200",
  services: "bg-indigo-100 text-indigo-800 border-indigo-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const itemCategoryColors = {
  fruit: "bg-red-50 text-red-700 border-red-200",
  vegetable: "bg-green-50 text-green-700 border-green-200",
  meat: "bg-red-50 text-red-800 border-red-300",
  poultry: "bg-orange-50 text-orange-700 border-orange-200",
  seafood: "bg-blue-50 text-blue-700 border-blue-200",
  dairy: "bg-yellow-50 text-yellow-700 border-yellow-200",
  bakery: "bg-amber-50 text-amber-700 border-amber-200",
  beverages: "bg-cyan-50 text-cyan-700 border-cyan-200",
  snacks: "bg-purple-50 text-purple-700 border-purple-200",
  frozen: "bg-slate-50 text-slate-700 border-slate-200",
  canned_goods: "bg-gray-50 text-gray-700 border-gray-200",
  personal_care: "bg-pink-50 text-pink-700 border-pink-200",
  household: "bg-indigo-50 text-indigo-700 border-indigo-200",
  other: "bg-neutral-50 text-neutral-700 border-neutral-200"
};

const PAGE_SIZE = 10;

export default function ReceiptsAnalyticsTable({ receipts, isLoading }) {
  const [sortConfig, setSortConfig] = useState({ key: 'receipt_date', direction: 'descending' });
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
  
  const SortableHeader = ({ sortKey, children }) => {
    const isSorted = sortConfig.key === sortKey;
    const icon = isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />) : null;
    return (
      <TableHead onClick={() => requestSort(sortKey)} className="cursor-pointer hover:bg-gray-100">
        <div className="flex items-center">
          {children}
          {icon}
        </div>
      </TableHead>
    );
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <CardTitle className="text-xl font-bold text-gray-900">
              All Receipts
            </CardTitle>
            <Link to={createPageUrl("Insights")}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                See Insights
              </Button>
            </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="text-sm font-bold text-[#3B82F6]">
                <SortableHeader sortKey="merchant_name">Store Name</SortableHeader>
                <TableHead>Items</TableHead>
                <SortableHeader sortKey="transaction_date">Date</SortableHeader>
                <SortableHeader sortKey="category">Category</SortableHeader>
                <SortableHeader sortKey="total_amount">Total Cost</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReceipts.length > 0 ? (
                paginatedReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="text-xs font-semibold text-vibrant-blue">
                    <TableCell className="font-medium">{receipt.merchant_name}</TableCell>
                    <TableCell>
                      {receipt.items && receipt.items.length > 0 ? (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Badge variant="secondary" className="cursor-pointer flex items-center gap-1.5">
                              <List className="w-3 h-3" />
                              {receipt.items.length} item(s)
                            </Badge>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-96">
                            <div className="space-y-3">
                              <h4 className="font-semibold">Items on Receipt</h4>
                              <div className="max-h-64 overflow-y-auto space-y-2">
                                {receipt.items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{item.name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        {item.quantity && (
                                          <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                        )}
                                        {item.item_category && (
                                          <Badge className={`${itemCategoryColors[item.item_category]} text-xs`}>
                                            {item.item_category.replace('_', ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <span className="font-semibold text-sm">£{item.price?.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      ) : (
                         <Badge variant="outline" className="flex items-center gap-1.5 text-gray-500">
                           <Info className="w-3 h-3" />
                           No items
                         </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDateSafe(receipt.transaction_date)}</TableCell>
                    <TableCell>
                       <Badge className={`${categoryColors[receipt.category]} border text-xs capitalize`}>
                        {receipt.category.replace('_', ' ')}
                       </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-right">£{receipt.total_amount?.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No receipts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
