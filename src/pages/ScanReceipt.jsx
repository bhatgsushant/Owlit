import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, FileText, X, Loader, CheckCircle, Save, Mic, Edit, PlusCircle, MinusCircle } from 'lucide-react';
import CameraView from '../components/CameraView';
import { SUB_CATEGORIES } from '../utils/categorize';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import MerchantLogo from '../components/ui/MerchantLogo';
import VoiceInput from '../components/ui/VoiceInput';
import { useAuth } from '@/hooks/useAuth';
import { STORE_DATA, getStoreInfo } from '../utils/logo';
import ModernNavbar from '../components/ui/ModernNavbar';
import ReceiptsAnalyticsTable from '../components/ReceiptsAnalyticsTable';

const RECENT_DOCUMENT_PLACEHOLDERS = [
  { id: 'doc-1', name: 'Lease Agreement.pdf', date: '15 Jun 2024' },
  { id: 'doc-2', name: 'Insurance Policy Renewal.pdf', date: '02 Jun 2024' },
  { id: 'doc-3', name: 'Employment Contract.pdf', date: '27 May 2024' },
];

function ScanModeToggle({ mode, setMode }) {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-full flex items-center border border-white/20">
                <button onClick={() => setMode('receipt')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${mode === 'receipt' ? 'bg-green-500 text-white' : 'text-gray-200 hover:bg-white/10'}`}>
                    Scan Receipt
                </button>
                <button onClick={() => setMode('document')} className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${mode === 'document' ? 'bg-green-500 text-white' : 'text-gray-200 hover:bg-white/10'}`}>
                    Scan Document
                </button>
            </div>
        </div>
    );
}

function ActionButton({ onClick, icon: Icon, text, isActive }) {
    const baseClasses = "w-full flex items-center justify-center py-2 px-4 rounded-full font-semibold text-sm shadow-lg transition-all duration-300 backdrop-blur-md border";
    const activeClasses = "bg-green-500 text-white border-transparent";
    const inactiveClasses = "bg-white/10 border-white/20 text-white hover:bg-white/20";
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <Icon size={16} className="mr-2"/>
            {text}
        </button>
    );
}

function DocumentPreview({ markdown, onApprove, onCancel }) {
    return (
        <div className="font-sans bg-[#111827] rounded-[14px] p-6 w-full text-left shadow-2xl border border-gray-800">
            <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-[22px] text-white leading-[1.3]">Extracted Document</h2>
                <span className="bg-[#1F2937] text-white font-semibold text-[13px] leading-[1.4] px-2.5 py-1 rounded-full">Preview</span>
            </div>
            <div className="space-y-4 text-base font-normal text-[#D1D5DB] leading-[1.6] max-h-96 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4B5563 #1F2937' }}>
                {markdown.split('\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="flex gap-4 mt-8">
                <button onClick={onApprove} className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex items-center justify-center"><CheckCircle size={20} className="mr-2" />Approve & Save</button>
                <button onClick={onCancel} className="w-full bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 flex items-center justify-center"><X size={20} className="mr-2" />Discard</button>
            </div>
        </div>
    );
}

function EditableReceipt({ data, setData, onSave, saveUserCategoryPreference, file, userStoreOverrides }) {
    const [mainCategoryOptions, setMainCategoryOptions] = useState(() => Object.keys(SUB_CATEGORIES));
    const [subCategoryOptionsMap, setSubCategoryOptionsMap] = useState(() =>
        Object.entries(SUB_CATEGORIES).reduce((acc, [key, values]) => {
            acc[key] = [...values];
            return acc;
        }, {})
    );
    const [storeTypeOptions, setStoreTypeOptions] = useState(() => {
        const base = new Set(
            Object.values(STORE_DATA).map((entry) => entry.StoreName_category)
        );
        base.add('Other');
        return Array.from(base).sort((a, b) => a.localeCompare(b));
    });
    const storeTypeManualRef = useRef(false);
    const savedPreferencesRef = useRef(new Set());
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setImagePreviewUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [file]);

    useEffect(() => {
        const newTotal = (data.line_items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
        setData(prev => ({ ...prev, total_amount: newTotal }));
    }, [data.line_items]);

    useEffect(() => {
        const info = getStoreInfo(data.merchant_name, userStoreOverrides);
        const derivedType = info?.StoreName_category || 'Other';
        setData(prev => ({ ...prev, store_type: derivedType }));
        setStoreTypeOptions(prevOptions => {
            if (prevOptions.some(option => option.toLowerCase() === derivedType.toLowerCase())) {
                return prevOptions;
            }
            return [...prevOptions, derivedType].sort((a, b) => a.localeCompare(b));
        });
        storeTypeManualRef.current = false;
    }, [data.merchant_name, setData, userStoreOverrides]);

    const handleFieldChange = (field, value) => {
        if (field === 'merchant_name') {
            const merchantValue = value;
            const info = getStoreInfo(merchantValue, userStoreOverrides);
            const derivedType = info?.StoreName_category || 'Other';
            const preserveManual = storeTypeManualRef.current;
            storeTypeManualRef.current = false;
            setData(prev => ({
                ...prev,
                merchant_name: merchantValue,
                store_type: preserveManual ? prev.store_type || derivedType : derivedType,
            }));
            setStoreTypeOptions(prevOptions => {
                if (prevOptions.some(option => option.toLowerCase() === derivedType.toLowerCase())) {
                    return prevOptions;
                }
                return [...prevOptions, derivedType].sort((a, b) => a.localeCompare(b));
            });
            return;
        }
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleStoreTypeChange = async (value) => {
        if (!value) return;
        const trimmed = typeof value === 'string' ? value.trim() : value;
        if (!trimmed) return;
        storeTypeManualRef.current = true;
        setStoreTypeOptions(prevOptions => {
            if (prevOptions.some(option => option.toLowerCase() === trimmed.toLowerCase())) {
                return prevOptions;
            }
            return [...prevOptions, trimmed].sort((a, b) => a.localeCompare(b));
        });
        setData(prev => ({ ...prev, store_type: trimmed }));

        // Call the new endpoint to save the override
        try {
            await fetch('/api/user-store-type-overrides', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchant_name: data.merchant_name,
                    store_type: trimmed,
                }),
                credentials: 'include',
            });
        } catch (error) {
            console.error('Failed to save store type override:', error);
        }
    };

    // ✅ UPDATED: Added DB save calls when main_category or sub_category changes
    const handleLineItemChange = (index, field, value) => {
        const normalizedValue =
            typeof value === 'string' ? value.trim() : value;

        let pendingPreference = null;

        setData(prev => {
            const currentItems = Array.isArray(prev.line_items) ? [...prev.line_items] : [];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: normalizedValue };

            if (field === 'main_category') {
                updatedItem.sub_category = ''; // reset subcategory on main category change
            }

            currentItems[index] = updatedItem;

            if (field === 'sub_category') {
                pendingPreference = {
                    itemName: (updatedItem.item || updatedItem.Item_Name || '').trim(),
                    mainCategory: (updatedItem.main_category || '').trim(),
                    subCategory: (updatedItem.sub_category || '').trim(),
                };
            }

            return { ...prev, line_items: currentItems };
        });

        if (pendingPreference) {
            saveUserCategoryPreference(
                pendingPreference.itemName,
                pendingPreference.mainCategory,
                pendingPreference.subCategory
            );
        }

        if (field === 'main_category') {
            const trimmedCategory = typeof normalizedValue === 'string' ? normalizedValue : '';
            if (trimmedCategory) {
                setMainCategoryOptions(prev => {
                    if (prev.some(option => option.toLowerCase() === trimmedCategory.toLowerCase())) {
                        return prev;
                    }
                    return [...prev, trimmedCategory];
                });
                setSubCategoryOptionsMap(prev => {
                    if (prev[trimmedCategory]) {
                        return prev;
                    }
                    return { ...prev, [trimmedCategory]: [] };
                });
            }
        }
    };

    const addLineItem = () => {
        setData(prev => ({
            ...prev,
            line_items: [...(prev.line_items || []), { item: '', price: 0, quantity: 1, main_category: 'other', sub_category: 'miscellaneous' }]
        }));
    };

    const removeLineItem = (index) => {
        setData(prev => ({
            ...prev,
            line_items: (prev.line_items || []).filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full text-left space-y-6">
            {imagePreviewUrl && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={imagePreviewUrl} alt="Receipt Preview" className="w-full h-auto object-contain max-h-96" />
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">Merchant</label>
                    <div className="flex items-center gap-2">
                        <MerchantLogo merchantName={data.merchant_name} />
                        <input
                            type="text"
                            value={data.merchant_name}
                            onChange={(e) => handleFieldChange('merchant_name', e.target.value)}
                            className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-green-500 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">Date</label>
                    <input
                        type="date"
                        value={data.transaction_date}
                        onChange={(e) => handleFieldChange('transaction_date', e.target.value)}
                        className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-green-500 text-sm"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">Store Type</label>
                    <SearchableDropdown
                        options={storeTypeOptions}
                        value={data.store_type || ''}
                        onChange={handleStoreTypeChange}
                        placeholder="Select store type"
                        allowCreate
                        onCreateOption={(newType) => {
                            const trimmed = newType.trim();
                            if (!trimmed) return;
                            setStoreTypeOptions(prev => {
                                if (prev.some(option => option.toLowerCase() === trimmed.toLowerCase())) {
                                    return prev;
                                }
                                return [...prev, trimmed].sort((a, b) => a.localeCompare(b));
                            });
                        }}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">Total</label>
                    <input
                        type="text"
                        value={`£${(data.total_amount ?? 0).toFixed(2)}`}
                        readOnly
                        className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:outline-none text-sm font-semibold"
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Line Items</h4>
                    <button onClick={addLineItem} className="text-green-500 hover:text-green-600"><PlusCircle size={22} /></button>
                </div>
                <div className="hidden md:grid grid-cols-7 gap-3 px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                    <div className="col-span-2">Item Name</div>
                    <div>Price</div>
                    <div>Qty</div>
                    <div>Category</div>
                    <div>Subcategory</div>
                    <div></div>
                </div>
            <div className="space-y-4">
                {(data.line_items || []).map((item, index) => {
                    const subCategoryOptions = subCategoryOptionsMap[item.main_category] || [];

                    return (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-1 md:grid-cols-7 gap-3 items-center">

                            <input type="text" value={item.item} onChange={(e) => handleLineItemChange(index, 'item', e.target.value)} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm md:col-span-2" />

                            <input type="number" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />

                            <input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />

                            <SearchableDropdown
                                options={mainCategoryOptions}
                                value={item.main_category}
                                onChange={(value) => handleLineItemChange(index, 'main_category', value)}
                                placeholder="Select Category"
                                allowCreate
                                onCreateOption={(newCategory) => {
                                    const trimmed = newCategory.trim();
                                    if (!trimmed) return;

                                    setMainCategoryOptions(prev => {
                                        if (prev.some(option => option.toLowerCase() === trimmed.toLowerCase())) {
                                            return prev;
                                        }
                                        return [...prev, trimmed];
                                    });
                                    setSubCategoryOptionsMap(prev => {
                                        if (prev[trimmed]) {
                                            return prev;
                                        }
                                        return { ...prev, [trimmed]: [] };
                                    });
                                    saveUserCategoryPreference(item.item, trimmed, '');
                                }}
                            />

                            <SearchableDropdown
                                options={subCategoryOptions}
                                value={item.sub_category}
                                onChange={(value) => handleLineItemChange(index, 'sub_category', value)}
                                placeholder="Select Subcategory"
                                allowCreate
                                onCreateOption={(newSub) => {
                                    const trimmed = newSub.trim();
                                    if (!trimmed) return;

                                    setSubCategoryOptionsMap(prev => ({
                                        ...prev,
                                        [item.main_category]: (() => {
                                            const current = prev[item.main_category] || [];
                                            if (current.some(option => option.toLowerCase() === trimmed.toLowerCase())) {
                                                return current;
                                            }
                                            return [...current, trimmed];
                                        })(),
                                    }));

                                    saveUserCategoryPreference(item.item, item.main_category, trimmed);
                                }}
                            />

                            <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-600 justify-self-center"><MinusCircle size={20} /></button>
                        </div>
                    );
                })}
            </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button onClick={onSave} className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center"><Save size={20} className="mr-2"/>Save Receipt</button>
            </div>
        </div>
    );
}

export default function ScanReceipt() {
  const [file, setFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [mode, setMode] = useState('upload');
  const [scanMode, setScanMode] = useState('receipt');
  const [markdownPreview, setMarkdownPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);
  const savedPreferencesRef = useRef(new Set());
  const { userStoreOverrides } = useAuth();

  const saveUserCategoryPreference = useCallback(async (itemName, mainCategory, subCategory) => {
    const trimmedName = (itemName || '').trim();
    const trimmedMain = (mainCategory || '').trim();
    const trimmedSub = (subCategory || '').trim();

    if (!trimmedName || !trimmedMain || !trimmedSub) return;

    const cacheKey = `${trimmedName.toLowerCase()}__${trimmedMain.toLowerCase()}__${trimmedSub.toLowerCase()}`;
    if (savedPreferencesRef.current.has(cacheKey)) return;

    try {
        const response = await fetch('/api/update-user-category', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: trimmedName,
                main_category: trimmedMain,
                sub_category: trimmedSub,
            }),
        });

        if (response.ok) {
            savedPreferencesRef.current.add(cacheKey);
        }
    } catch (err) {
        console.error('Failed to save user category preference', err);
    }
}, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('receiptwise-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('receiptwise-theme', newTheme ? 'dark' : 'light');
  };

  const fetchReceipts = useCallback(async () => {
    setIsReceiptsLoading(true);
    try {
      const response = await fetch('/api/receipts', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }
      const data = await response.json();
      setRecentReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setIsReceiptsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setMarkdownPreview(null);
      setMode('upload');
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setExtractedData(null);
      setMarkdownPreview(null);
      setMode('upload');
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scanMode', scanMode);
    try {
      const resp = await fetch('/api/scan', {
  method: 'POST',
  body: formData,
  credentials: 'include',   // ✅ send login session cookie
});
      if (!resp.ok) throw new Error('Server error');
      if (scanMode === 'receipt') {
        setExtractedData(await resp.json());
      } else {
        setMarkdownPreview(await resp.text());
      }
    } catch (error) {
      console.error(error);
      alert(`Failed to process file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUploadClick = () => {
    setMode('upload');
    fileInputRef.current.click();
  }

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode !== 'upload') {
        setFile(null);
    }
    if (newMode === 'camera') {
        setIsCameraOpen(true);
    }
  };

  const handleCapture = (capturedFile) => {
    setFile(capturedFile);
    setIsCameraOpen(false);
    setMode('upload');
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setMarkdownPreview(null);
    setMode('upload');
  };
  
    const handleSave = async () => {
    if (!extractedData || !Array.isArray(extractedData.line_items)) {
      alert('No receipt data to save.');
      return;
    }

    const formData = new FormData();
    formData.append('receiptData', JSON.stringify(extractedData));
    if (file) {
      formData.append('receiptImage', file);
    }

    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to save receipt');
      }

      alert('Receipt saved successfully!');
      fetchReceipts();
      handleReset();
    } catch (error) { 
      console.error(error);
      alert(`Failed to save receipt: ${error.message}`);
    }
  };

  const pageTitle = scanMode === 'receipt' ? 'Scan Receipt' : 'Scan Document';

  return (
    <>
        <button
            data-testid="set-data-button"
            style={{ display: 'none' }}
            onClick={(e) => setExtractedData(e.detail)}
        />
      <style>{`
          .gradient-bg { background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); background-size: 400% 400%; animation: gradient 15s ease infinite; width: 100%; }
          @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
      <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeInOut' }}>
        <ModernNavbar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      </motion.div>

      <div className="gradient-bg pt-20 min-h-screen">
        {isCameraOpen && <CameraView onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}

        {extractedData ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-8">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                        <h1 className="text-3xl md:text-4xl font-bold text-white">Review & Edit</h1>
                    </div>
                    <EditableReceipt data={extractedData} setData={setExtractedData} onSave={handleSave} saveUserCategoryPreference={saveUserCategoryPreference} file={file} userStoreOverrides={userStoreOverrides} />
                    <button onClick={handleReset} className="mt-8 w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors">Scan Another</button>
                </div>
            </div>
        ) : markdownPreview ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full">
                    <DocumentPreview markdown={markdownPreview} onApprove={() => {}} onCancel={handleReset} />
                </div>
            </div>
        ) : (
            <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center min-h-[calc(100vh-5rem)]">
                <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md p-8 rounded-2xl">
                    <ScanModeToggle mode={scanMode} setMode={setScanMode} />
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{pageTitle}</h1>
                    <p className="text-md text-gray-200 mb-8">Choose your input method to get started.</p>

                    {file ? (
                        <div className="bg-white/20 p-6 rounded-2xl w-full text-left">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Uploaded File</h3>
                                <button onClick={() => setFile(null)} className="text-gray-300 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="flex items-center p-4 bg-black/20 rounded-lg">
                                <FileText size={24} className="text-green-400 mr-4" />
                                <div>
                                    <p className="font-medium text-white">{file.name}</p>
                                    <p className="text-sm text-gray-300">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <button onClick={handleProcess} disabled={isProcessing} className="mt-6 w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-400 flex items-center justify-center">
                                {isProcessing ? <><Loader size={20} className="animate-spin mr-2"/> Processing...</> : `Process ${pageTitle}`}
                            </button>
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-300/50 rounded-2xl p-10 text-center cursor-pointer transition-colors hover:border-green-400 bg-white/10" onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleUploadClick}>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf"/>
                            <Upload size={48} className="text-gray-300 mb-4 mx-auto" />
                            <p className="text-lg font-semibold text-white">Drag & Drop or Click to Upload</p>
                        </div>
                    )}

                    {!file && (
                        <div className={`mt-8 grid grid-cols-1 sm:grid-cols-2 ${scanMode === 'receipt' ? 'md:grid-cols-4' : 'sm:grid-cols-2'} gap-4`}>
                            <ActionButton text="Upload" icon={Upload} onClick={handleUploadClick} isActive={mode === 'upload'} />
                            <ActionButton text="Camera" icon={Camera} onClick={() => handleModeChange('camera')} isActive={mode === 'camera'} />
                            {scanMode === 'receipt' && (
                                <>
                                    <ActionButton text="Manual" icon={Edit} onClick={() => handleModeChange('manual')} isActive={mode === 'manual'} />
                                    <ActionButton text="Voice" icon={Mic} onClick={() => handleModeChange('voice')} isActive={mode === 'voice'} />
                                </>
                            )}
                        </div>
                    )}

                    <div className="mt-12 text-left">
                      {scanMode === 'receipt' ? (
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-semibold text-white">Recent Receipts</h2>
                              <p className="text-sm text-gray-300">Review everything you have already captured without leaving this flow.</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <ReceiptsAnalyticsTable receipts={recentReceipts} isLoading={isReceiptsLoading} />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-black/30 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-semibold text-white">Recent Documents</h2>
                              <p className="text-sm text-gray-300">Documents you process will appear here for quick reference.</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            {RECENT_DOCUMENT_PLACEHOLDERS.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                                <span className="text-sm font-medium text-white">{doc.name}</span>
                                <span className="text-xs text-gray-300 uppercase tracking-widest">{doc.date}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </>
  );
}
