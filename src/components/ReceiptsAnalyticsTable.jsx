import { ChevronUp, ChevronDown, ChevronsLeft, ChevronsRight, BarChart2, Trash2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MerchantLogo from './ui/MerchantLogo';
import StoreType from './ui/StoreType';

const PAGE_SIZE = 5;

export default function ReceiptsAnalyticsTable({ receipts, isLoading, onDelete, onEdit, showInsightsLink = true }) {
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const hasDeleteAction = typeof onDelete === 'function';
  const hasEditAction = typeof onEdit === 'function';
  const hasActions = hasDeleteAction || hasEditAction;

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
    const icon = isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />) : null;
    return (
      <TableHead onClick={() => requestSort(sortKey)} className={`cursor-pointer transition-colors ${className}`}>
        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {children}
          {icon}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="font-sans border border-white/10 bg-cyan-950/30 backdrop-blur-xl rounded-2xl shadow-2xl">
      <div className="flex flex-row items-center justify-between p-4 md:p-6 border-b border-white/10">
          <h2 className="font-display text-lg font-semibold text-white">
            All Receipts
          </h2>
          {showInsightsLink && (
            <Link to={createPageUrl("Insights")}>
              <Button variant="ghost" size="sm" className="flex items-center gap-2 text-sm font-semibold text-violet-300 hover:bg-violet-500/20">
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline">View Insights</span>
              </Button>
            </Link>
          )}
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="border-b-white/10">
              <SortableHeader sortKey="merchant_name" className="pl-6">Store</SortableHeader>
              <SortableHeader sortKey="transaction_date">Date</SortableHeader>
              <SortableHeader sortKey="category">Type</SortableHeader>
              <SortableHeader sortKey="total_amount" className="text-right">Total</SortableHeader>
              {hasActions && <TableHead className="w-[100px] pr-6 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(PAGE_SIZE)].map((_, i) => (
                <TableRow key={i} className="border-none">
                  <TableCell colSpan={hasActions ? 5 : 4} className="p-2"><div className="h-12 bg-gray-800/50 rounded-md animate-pulse" /></TableCell>
                </TableRow>
              ))
            ) : paginatedReceipts.length > 0 ? (
              paginatedReceipts.map((receipt) => (
                <TableRow key={receipt.id} className="group border-none hover:bg-white/5">
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <MerchantLogo merchantName={receipt.merchant_name} />
                      <span className="font-semibold text-sm text-gray-200">{receipt.merchant_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">{formatDateSafe(receipt.transaction_date, "MMM d, yyyy")}</TableCell>
                  <TableCell><StoreType merchantName={receipt.merchant_name} /></TableCell>
                  <TableCell className="font-semibold text-right text-sm text-gray-200">{receipt.total_amount?.toFixed(2)}</TableCell>
                  {hasActions && (
                    <TableCell className="pr-6">
                      <div className="flex justify-end gap-2">
                          {hasEditAction && (
                            <Button variant="ghost" size="icon" onClick={() => onEdit(receipt)} className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500/80 hover:text-blue-500 hover:bg-blue-500/10">
                                <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {hasDeleteAction && (
                            <Button variant="ghost" size="icon" onClick={() => onDelete(receipt.id)} className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500/80 hover:text-red-500 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-none">
                <TableCell colSpan={hasActions ? 5 : 4} className="h-48 text-center text-gray-500">
                  No receipts found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-2 border-t border-white/10">
          <div className="text-xs text-gray-500 px-2">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="w-8 h-8 text-gray-400 hover:text-white"><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="w-8 h-8 text-gray-400 hover:text-white"><ChevronUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="w-8 h-8 text-gray-400 hover:text-white"><ChevronDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 text-gray-400 hover:text-white"><ChevronsRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
