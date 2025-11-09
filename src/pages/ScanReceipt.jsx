import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import { useNavigate } from 'react-router-dom';

import {
  Upload,
  Camera,
  FileText,
  X,
  CheckCircle,
  Save,
  Mic,
  Edit,
  PlusCircle,
  MinusCircle,
  Store,
  Calendar,
  Tag,
  Apple,
  Sprout,
  Drumstick,
  Fish,
  CupSoda,
  Droplet,
  Snowflake,
  Package,
  PoundSterling,
  Coffee,
  Fuel,
  Sparkles,
  HeartPulse,
  Dumbbell,
  Home,
  Cpu,
  Plug,
  Shirt,
  Gem,
  Car,
  Plane,
  PenLine,
  GraduationCap,
  Wallet,
  Clapperboard,
  PawPrint,
  Gift,
  UtensilsCrossed,
  CircleEllipsis,
} from 'lucide-react';
import CameraView from '../components/CameraView';
import { SUB_CATEGORIES } from '../utils/categorize';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import MerchantLogo from '../components/ui/MerchantLogo';
import VoiceInput from '../components/ui/VoiceInput';
import { useAuth } from '@/hooks/useAuth';
import { STORE_DATA, getStoreInfo } from '../utils/logo';
import ReceiptsAnalyticsTable from '../components/ReceiptsAnalyticsTable';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

const RECENT_DOCUMENT_PLACEHOLDERS = [
  { id: 'doc-1', name: 'Lease Agreement.pdf', date: '15 Jun 2024' },
  { id: 'doc-2', name: 'Insurance Policy Renewal.pdf', date: '02 Jun 2024' },
  { id: 'doc-3', name: 'Employment Contract.pdf', date: '27 May 2024' },
];
// ✅ API Base URL helper (required for production!)
const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV ? 'http://localhost:3001' : 'https://owlit.onrender.com')
).replace(/\/$/, '');

const withApiBase = (path) => `${API_BASE}${path}`;


const normalizeMerchantName = (name = '') =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const CATEGORY_ICON_MAP = {
  fruit: Apple,
  vegetable: Sprout,
  meat: Drumstick,
  poultry: Drumstick,
  seafood: Fish,
  dairy: Droplet,
  bakery: Package,
  beverages: CupSoda,
  snacks: Package,
  frozen: Snowflake,
  canned_goods: Package,
  personal_care: Sparkles,
  health: HeartPulse,
  fitness: Dumbbell,
  household: Home,
  electronics: Cpu,
  utilities: Plug,
  clothing: Shirt,
  jewelry: Gem,
  transport: Car,
  travel: Plane,
  stationery: PenLine,
  education: GraduationCap,
  finance: Wallet,
  entertainment: Clapperboard,
  pets: PawPrint,
  gifts: Gift,
  dining: UtensilsCrossed,
  other: CircleEllipsis,
};

const getCategoryIconComponent = (category) => {
  if (!category) return Tag;
  const key = String(category).toLowerCase();
  return CATEGORY_ICON_MAP[key] || Tag;
};

const SUBCATEGORY_ICON_MATCHERS = [
  { test: /(coffee|tea|drink)/, icon: Coffee },
  { test: /(beer|wine|spirits)/, icon: CupSoda },
  { test: /(fuel|gas|diesel)/, icon: Fuel },
  { test: /(bread|pastr|cake|cookie|muffin)/, icon: Package },
  { test: /(milk|cheese|yogurt|butter|cream|egg)/, icon: Droplet },
  { test: /(fish|seafood|prawn|shrimp)/, icon: Fish },
  { test: /(fruit|apple|banana|grape|melon)/, icon: Apple },
  { test: /(vegetable|greens|onion|tomato|pepper)/, icon: Sprout },
  { test: /(meat|beef|pork|lamb)/, icon: Drumstick },
  { test: /(chicken|turkey|duck)/, icon: Drumstick },
  { test: /(laundry|cleaning|detergent)/, icon: Sparkles },
  { test: /(medicine|vitamin|pain|supplement)/, icon: HeartPulse },
  { test: /(gym|fitness|protein)/, icon: Dumbbell },
  { test: /(electronics|charger|laptop|mobile|battery)/, icon: Cpu },
  { test: /(electricity|internet|water|bill)/, icon: Plug },
  { test: /(shoe|shirt|jean|dress|clothing|sock)/, icon: Shirt },
  { test: /(jewel|ring|necklace|bracelet)/, icon: Gem },
  { test: /(bus|train|taxi|uber|parking)/, icon: Car },
  { test: /(flight|hotel|visa|tour|luggage)/, icon: Plane },
  { test: /(pen|notebook|paper|folder)/, icon: PenLine },
  { test: /(book|course|tuition|school)/, icon: GraduationCap },
  { test: /(bank|fee|insurance|loan|interest)/, icon: Wallet },
  { test: /(movie|music|game|event|stream)/, icon: Clapperboard },
  { test: /(pet|vet|groom)/, icon: PawPrint },
  { test: /(gift|donation|charity)/, icon: Gift },
  { test: /(restaurant|takeaway|fast_food|pub|bar)/, icon: UtensilsCrossed },
];

const getSubcategoryIconComponent = (subCategory) => {
  if (!subCategory) return Tag;
  const key = String(subCategory).toLowerCase();
  for (const matcher of SUBCATEGORY_ICON_MATCHERS) {
    if (matcher.test.test(key)) {
      return matcher.icon;
    }
  }
  return Tag;
};

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
                <h2 className="font-bold text-xl text-white leading-[1.3]">Extracted Document</h2>
                <span className="bg-[#1F2937] text-white font-semibold text-xs leading-[1.4] px-2.5 py-1 rounded-full">Preview</span>
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
    const [storeList, setStoreList] = useState([]);
    const storeTypeManualRef = useRef(false);
    const savedPreferencesRef = useRef(new Set());
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const merchantOptions = useMemo(() => {
        const trimmed = (data.merchant_name || '').trim().toLowerCase();
        const matches = [];
        const others = [];
        const seen = new Set();

        storeList.forEach(({ merchant_name }) => {
            if (!merchant_name) return;
            const lower = merchant_name.toLowerCase();
            if (seen.has(lower)) return;
            seen.add(lower);
            if (!trimmed || lower.includes(trimmed)) {
                matches.push(merchant_name);
            } else {
                others.push(merchant_name);
            }
        });

        let combined = [...matches, ...others];
        if (data.merchant_name) {
            const lowerCurrent = data.merchant_name.toLowerCase();
            const alreadyIncluded = combined.some((name) => name.toLowerCase() === lowerCurrent);
            if (!alreadyIncluded) {
                combined = [data.merchant_name, ...combined];
            }
        }
        return combined;
    }, [storeList, data.merchant_name]);

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
        let isMounted = true;
        async function loadStores() {
            try {
                const resp = await fetch(withApiBase('/api/store-info'), { credentials: 'include' });
                if (!resp.ok) return;
                const json = await resp.json();
                if (isMounted) {
                    setStoreList(Array.isArray(json) ? json : []);
                }
            } catch (error) {
                console.error('Failed to load store list:', error);
            }
        }
        loadStores();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const newTotal = (data.line_items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
        setData(prev => ({ ...prev, total_amount: newTotal }));
    }, [data.line_items, setData]);

    const updateMerchantSelection = useCallback(
        (rawValue) => {
            const merchantValue = typeof rawValue === 'string' ? rawValue.trim() : '';
            const matchedStore = merchantValue
                ? storeList.find(
                    (store) => (store.merchant_name || '').toLowerCase() === merchantValue.toLowerCase()
                  )
                : null;
            const info = getStoreInfo(merchantValue, userStoreOverrides);
            const derivedType = matchedStore?.store_type || info?.StoreName_category || 'Other';
            const preserveManual = storeTypeManualRef.current;
            storeTypeManualRef.current = false;

            setData((prev) => {
                const next = {
                    ...prev,
                    merchant_name: merchantValue,
                    selectedMerchantId: matchedStore ? matchedStore.id : null,
                };
                next.store_type = preserveManual ? (prev.store_type || derivedType) : derivedType;
                return next;
            });

            if (derivedType) {
                setStoreTypeOptions((prevOptions) => {
                    if (prevOptions.some((option) => option.toLowerCase() === derivedType.toLowerCase())) {
                        return prevOptions;
                    }
                    return [...prevOptions, derivedType].sort((a, b) => a.localeCompare(b));
                });
            }
        },
        [setData, storeList, userStoreOverrides]
    );

    useEffect(() => {
        const merchantValue = (data.merchant_name || '').trim();
        const matchedStore = merchantValue
            ? storeList.find(
                (store) => (store.merchant_name || '').toLowerCase() === merchantValue.toLowerCase()
              )
            : null;
        const info = getStoreInfo(merchantValue, userStoreOverrides);
        const derivedType = matchedStore?.store_type || info?.StoreName_category || 'Other';

        if (derivedType) {
            setStoreTypeOptions((prevOptions) => {
                if (prevOptions.some((option) => option.toLowerCase() === derivedType.toLowerCase())) {
                    return prevOptions;
                }
                return [...prevOptions, derivedType].sort((a, b) => a.localeCompare(b));
            });
        }

        const shouldUpdateStoreType =
            !storeTypeManualRef.current &&
            derivedType &&
            data.store_type !== derivedType;

        const shouldUpdateSelected =
            !data.canonical_merchant_id &&
            matchedStore &&
            data.selectedMerchantId !== matchedStore.id;

        if (shouldUpdateStoreType || shouldUpdateSelected) {
            setData((prev) => {
                let updated = prev;
                if (shouldUpdateStoreType && prev.store_type !== derivedType) {
                    updated = { ...updated, store_type: derivedType };
                }
                if (shouldUpdateSelected && matchedStore) {
                    if (updated === prev) {
                        updated = { ...updated };
                    }
                    updated.selectedMerchantId = matchedStore.id;
                }
                return updated;
            });
        }
    }, [
        data.merchant_name,
        data.store_type,
        data.selectedMerchantId,
        data.canonical_merchant_id,
        storeList,
        userStoreOverrides,
        setData,
    ]);

    const handleFieldChange = (field, value) => {
        if (field === 'merchant_name') {
            updateMerchantSelection(typeof value === 'string' ? value : '');
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
            await fetch(withApiBase('/api/user-store-type-overrides'), {
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

    const InputWithIcon = ({
        icon: IconComponent,
        value,
        onChange,
        type = 'text',
        placeholder,
        iconClassName = 'text-gray-500 dark:text-gray-300',
        inputClassName = 'text-sm',
        ...rest
    }) => (
        <label className="w-full">
            <span className="sr-only">{placeholder}</span>
            <div className="flex flex-wrap items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-2 border border-transparent focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition">
                <IconComponent className={cn('h-4 w-4', iconClassName)} />
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={cn('flex-1 min-w-0 bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100', inputClassName)}
                    {...rest}
                />
            </div>
        </label>
    );

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
            <div className="bg-gray-50/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/40 rounded-3xl p-4 md:p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-2">Store Name</span>
                        <div className="flex items-center gap-3">
                            <MerchantLogo merchantName={data.merchant_name} />
                            <SearchableDropdown
                                options={merchantOptions}
                                value={data.merchant_name || ''}
                                onChange={updateMerchantSelection}
                                placeholder="Select merchant"
                                allowCreate
                                startIcon={<Store className="h-3.5 w-3.5 text-emerald-500" />}
                                pill
                                labelClassName="text-xs md:text-sm"
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-2">Receipt Date</span>
                        <InputWithIcon
                            icon={Calendar}
                            value={data.transaction_date || ''}
                            onChange={(e) => handleFieldChange('transaction_date', e.target.value)}
                            type="date"
                            placeholder="Transaction date"
                            iconClassName="text-blue-500"
                            inputClassName="text-xs md:text-sm"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-2">Store Type</span>
                        <SearchableDropdown
                            options={storeTypeOptions}
                            value={data.store_type || ''}
                            onChange={handleStoreTypeChange}
                            placeholder="Store type"
                            allowCreate
                            startIcon={<Tag className="h-3.5 w-3.5 text-amber-500" />}
                            pill
                            labelClassName="text-xs md:text-sm"
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
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500 mb-2">Total</span>
                        <div className="flex flex-wrap items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-2 border border-transparent text-xs md:text-sm font-semibold">
                            <span className="text-emerald-500">£</span>
                            <span>{(data.total_amount ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
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
                    const CategoryIconComponent = getCategoryIconComponent(item.main_category);
                    const SubcategoryIconComponent = getSubcategoryIconComponent(item.sub_category);

                    return (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-1 md:grid-cols-7 gap-3 items-center">

                            <input type="text" value={item.item} onChange={(e) => handleLineItemChange(index, 'item', e.target.value)} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm md:col-span-2" />

                            <InputWithIcon
                                icon={PoundSterling}
                                value={item.price}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    const numeric = raw === '' ? 0 : parseFloat(raw);
                                    handleLineItemChange(index, 'price', Number.isNaN(numeric) ? 0 : numeric);
                                }}
                                type="number"
                                placeholder="Price"
                                iconClassName="text-emerald-500"
                                inputClassName="text-sm"
                                step="0.01"
                                min="0"
                            />

                            <input type="number" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />

                            <div className="flex items-center gap-2">
                                <CategoryIconComponent className="h-4 w-4 text-emerald-500" />
                                <SearchableDropdown
                                    options={mainCategoryOptions}
                                    value={item.main_category}
                                    onChange={(value) => handleLineItemChange(index, 'main_category', value)}
                                    placeholder="Select Category"
                                    allowCreate
                                    pill
                                    labelClassName="text-xs md:text-sm"
                                    className="flex-1"
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
                            </div>

                            <div className="flex items-center gap-2">
                                <SubcategoryIconComponent className="h-4 w-4 text-sky-500" />
                                <SearchableDropdown
                                    options={subCategoryOptions}
                                    value={item.sub_category}
                                    onChange={(value) => handleLineItemChange(index, 'sub_category', value)}
                                    placeholder="Select Subcategory"
                                    allowCreate
                                    pill
                                    labelClassName="text-xs md:text-sm"
                                    className="flex-1"
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
                            </div>

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
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);
  const [saveSuccessPrompt, setSaveSuccessPrompt] = useState(false);
  const fileInputRef = useRef(null);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);
  const savedPreferencesRef = useRef(new Set());
  const { userStoreOverrides } = useAuth();
  const [loadingAnimation, setLoadingAnimation] = useState(null);
  const [isMultiPage, setIsMultiPage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/ai-cpu-loading.json')
      .then((response) => response.json())
      .then((data) => setLoadingAnimation(data));
  }, []);

  useEffect(() => {
    const prefilled = sessionStorage.getItem('multi-scan-result');
    if (prefilled) {
      try {
        const parsed = JSON.parse(prefilled);
        if (parsed) {
          setExtractedData(parsed);
          setMarkdownPreview(null);
          setFile(null);
          setMode('upload');
          setScanMode('receipt');
        }
      } catch (err) {
        console.error('Failed to load multi scan result', err);
      } finally {
        sessionStorage.removeItem('multi-scan-result');
      }
    }
  }, []);

  const saveUserCategoryPreference = useCallback(async (itemName, mainCategory, subCategory) => {
    const trimmedName = (itemName || '').trim();
    const trimmedMain = (mainCategory || '').trim();
    const trimmedSub = (subCategory || '').trim();

    if (!trimmedName || !trimmedMain || !trimmedSub) return;

    const cacheKey = `${trimmedName.toLowerCase()}__${trimmedMain.toLowerCase()}__${trimmedSub.toLowerCase()}`;
    if (savedPreferencesRef.current.has(cacheKey)) return;

    try {
        const response = await fetch(withApiBase('/api/update-user-category'), {
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

  const fetchReceipts = useCallback(async () => {
    setIsReceiptsLoading(true);
    try {
      const response = await fetch(withApiBase('/api/receipts'), { credentials: 'include' });
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

  const processFile = async (fileToProcess) => {
    if (!fileToProcess) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', fileToProcess);
    formData.append('scanMode', scanMode);
    let pendingExtractedData = null;
    let pendingMarkdown = null;
    try {
      const resp = await fetch(withApiBase('/api/scan'), {
  method: 'POST',
  credentials: 'include',
  body: formData
});
      if (!resp.ok) throw new Error('Server error');
      if (scanMode === 'receipt') {
        pendingExtractedData = await resp.json();
      } else {
        pendingMarkdown = await resp.text();
      }
      if (pendingExtractedData) {
        setExtractedData(pendingExtractedData);
      }
      if (pendingMarkdown) {
        setMarkdownPreview(pendingMarkdown);
      }
    } catch (error) {
      console.error(error);
      alert(`Failed to process file: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setMarkdownPreview(null);
      setMode('upload');
      processFile(selectedFile);
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
      processFile(droppedFile);
    }
  };

  const handleMultiPageToggle = (event) => {
    const checked = event.target.checked;
    setIsMultiPage(checked);
    if (checked) {
      navigate(createPageUrl('ScanReceiptMulti'));
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
    if (newMode === 'manual') {
        setExtractedData({
            merchant_name: '',
            transaction_date: new Date().toISOString().split('T')[0],
            total_amount: 0,
            line_items: [],
        });
    }
  };

  const handleCapture = (capturedFile) => {
    setFile(capturedFile);
    setExtractedData(null);
    setMarkdownPreview(null);
    setIsCameraOpen(false);
    setMode('upload');
    processFile(capturedFile);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setMarkdownPreview(null);
    setMode('upload');
    setDuplicatePrompt(null);
    setSaveSuccessPrompt(false);
  };
  
  const handleSave = async (options = {}) => {
    if (!extractedData || !Array.isArray(extractedData.line_items)) {
      alert('No receipt data to save.');
      return;
    }

    if (!extractedData.canonical_merchant_id && extractedData.selectedMerchantId) {
      const aliasSource = extractedData.merchant_alias || extractedData.merchant_name || '';
      const alias = normalizeMerchantName(aliasSource);
      if (alias) {
        try {
          const response = await fetch(withApiBase('/api/merchant-aliases'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              alias,
              merchant_id: extractedData.selectedMerchantId,
            }),
          });
          if (!response.ok) {
            console.error('Failed to save merchant alias:', await response.text());
          }
        } catch (error) {
          console.error('Failed to save merchant alias:', error);
        }
      }
    }

    const formData = new FormData();
    formData.append('receiptData', JSON.stringify(extractedData));
    if (file) {
      formData.append('receiptImage', file);
    }
    if (options.duplicateAction) {
      formData.append('duplicateAction', options.duplicateAction);
    }
    if (options.existingReceiptId) {
      formData.append('existingReceiptId', options.existingReceiptId);
    }

    try {
      const response = await fetch(withApiBase('/api/receipts'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let message = 'Failed to save receipt';
        let errorPayload = null;
        try {
          errorPayload = await response.json();
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch (_) {
          // ignore JSON parse issues
        }

        if (response.status === 409) {
          if (errorPayload?.code === 'DUPLICATE_RECEIPT' && errorPayload?.existingReceiptId) {
            setDuplicatePrompt({
              receiptId: errorPayload.existingReceiptId,
              message,
            });
            return;
          }

          alert(message);
          return;
        }

        throw new Error(message);
      }

      fetchReceipts();
      handleReset();
      setSaveSuccessPrompt(true);
    } catch (error) { 
      console.error(error);
      alert(`Failed to save receipt: ${error.message}`);
    }
  };

  const handleDuplicateDecision = (action) => {
    if (!duplicatePrompt) return;
    const payload = {
      duplicateAction: action,
      existingReceiptId: duplicatePrompt.receiptId,
    };
    setDuplicatePrompt(null);
    handleSave(payload);
  };

  const pageTitle = scanMode === 'receipt' ? 'Scan Receipt' : 'Scan Document';

  return (
    <>
      {duplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <p className="text-lg font-semibold text-gray-900">This receipt already exists.</p>
            <p className="mt-2 text-sm text-gray-600">
              {duplicatePrompt.message && duplicatePrompt.message !== 'This receipt already exists.'
                ? duplicatePrompt.message
                : 'Choose whether to replace the existing record or keep both copies.'}
            </p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={() => handleDuplicateDecision('replace')}
                className="rounded-xl bg-red-500 px-4 py-3 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                Replace
              </button>
              <button
                onClick={() => handleDuplicateDecision('keep')}
                className="rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                Keep Both
              </button>
              <button
                onClick={() => setDuplicatePrompt(null)}
                className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {saveSuccessPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <CheckCircle size={48} className="mx-auto text-green-500" />
            <p className="mt-4 text-xl font-semibold text-gray-900">Receipt saved</p>
            <p className="mt-2 text-sm text-gray-600">
              Your receipt has been stored successfully.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setSaveSuccessPrompt(false)}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
        <button
            data-testid="set-data-button"
            style={{ display: 'none' }}
            onClick={(e) => setExtractedData(e.detail)}
        />
      <style>{`
          .gradient-bg { background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab); background-size: 400% 400%; animation: gradient 15s ease infinite; width: 100%; }
          @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>

      <div className="gradient-bg pt-16 min-h-screen">
        {isCameraOpen && <CameraView onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}

        {extractedData ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-5">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
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
                                <button
                                  onClick={() => {
                                    setFile(null);
                                    setExtractedData(null);
                                    setMarkdownPreview(null);
                                  }}
                                  className="text-gray-300 hover:text-white"
                                >
                                  <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center p-4 bg-black/20 rounded-lg">
                                <FileText size={24} className="text-green-400 mr-4" />
                                <div>
                                    <p className="font-medium text-white">{file.name}</p>
                                    <p className="text-sm text-gray-300">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center mt-6">
                                    {loadingAnimation && <Lottie animationData={loadingAnimation} loop={true} style={{ width: 150, height: 150 }} />}
                                    <p className="text-white mt-4">Processing your receipt...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border-2 border-dashed border-gray-300/50 rounded-2xl p-10 text-center cursor-pointer transition-colors hover:border-green-400 bg-white/10" onDragOver={handleDragOver} onDrop={handleDrop} onClick={handleUploadClick}>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf"/>
                            <Upload size={48} className="text-gray-300 mb-4 mx-auto" />
                            <p className="text-lg font-semibold text-white">Drag & Drop or Click to Upload</p>
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white">
                      <input
                        id="multi-page-toggle"
                        type="checkbox"
                        checked={isMultiPage}
                        onChange={handleMultiPageToggle}
                        className="h-4 w-4 rounded border-white/60 bg-transparent"
                      />
                      <label htmlFor="multi-page-toggle" className="cursor-pointer select-none">
                        Multiple pages?
                      </label>
                    </div>

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
