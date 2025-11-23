import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Lottie from 'lottie-react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  Loader2,
} from 'lucide-react';
import CameraView from '../components/CameraView';
import { SUB_CATEGORIES } from '../utils/categorize';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import MerchantLogo from '../components/ui/MerchantLogo';
import VoiceInput from '../components/ui/VoiceInput';
import { useAuth } from '@/hooks/useAuth';
import { STORE_DATA, getStoreInfo } from '../utils/logo';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

const PENDING_PREVIEW_STORAGE_KEY = 'pending-receipt-preview';
const RESUME_QUERY_PARAM = 'resume';

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

const CATEGORY_ICON_KEY_MAP = { ...CATEGORY_ICON_MAP };
const CATEGORY_ICON_KEYS = new Set(Object.keys(CATEGORY_ICON_KEY_MAP));

const SUBCATEGORY_ICON_MATCHERS = [
  { key: 'coffee', test: /(coffee|tea|drink)/, icon: Coffee },
  { key: 'beer_wine', test: /(beer|wine|spirits)/, icon: CupSoda },
  { key: 'fuel', test: /(fuel|gas|diesel)/, icon: Fuel },
  { key: 'bread', test: /(bread|pastr|cake|cookie|muffin)/, icon: Package },
  { key: 'dairy', test: /(milk|cheese|yogurt|butter|cream|egg)/, icon: Droplet },
  { key: 'fish', test: /(fish|seafood|prawn|shrimp)/, icon: Fish },
  { key: 'fruit', test: /(fruit|apple|banana|grape|melon)/, icon: Apple },
  { key: 'vegetable', test: /(vegetable|greens|onion|tomato|pepper)/, icon: Sprout },
  { key: 'meat', test: /(meat|beef|pork|lamb)/, icon: Drumstick },
  { key: 'chicken', test: /(chicken|turkey|duck)/, icon: Drumstick },
  { key: 'cleaning', test: /(laundry|cleaning|detergent)/, icon: Sparkles },
  { key: 'medicine', test: /(medicine|vitamin|pain|supplement)/, icon: HeartPulse },
  { key: 'fitness', test: /(gym|fitness|protein)/, icon: Dumbbell },
  { key: 'electronics', test: /(electronics|charger|laptop|mobile|battery)/, icon: Cpu },
  { key: 'utilities', test: /(electricity|internet|water|bill)/, icon: Plug },
  { key: 'clothing', test: /(shoe|shirt|jean|dress|clothing|sock)/, icon: Shirt },
  { key: 'jewelry', test: /(jewel|ring|necklace|bracelet)/, icon: Gem },
  { key: 'transport', test: /(bus|train|taxi|uber|parking)/, icon: Car },
  { key: 'travel', test: /(flight|hotel|visa|tour|luggage)/, icon: Plane },
  { key: 'stationery', test: /(pen|notebook|paper|folder)/, icon: PenLine },
  { key: 'education', test: /(book|course|tuition|school)/, icon: GraduationCap },
  { key: 'finance', test: /(bank|fee|insurance|loan|interest)/, icon: Wallet },
  { key: 'entertainment', test: /(movie|music|game|event|stream)/, icon: Clapperboard },
  { key: 'pets', test: /(pet|vet|groom)/, icon: PawPrint },
  { key: 'gifts', test: /(gift|donation|charity)/, icon: Gift },
  { key: 'dining', test: /(restaurant|takeaway|fast_food|pub|bar)/, icon: UtensilsCrossed },
];

const SUBCATEGORY_ICON_KEY_MAP = SUBCATEGORY_ICON_MATCHERS.reduce((acc, matcher) => {
  acc[matcher.key] = matcher.icon;
  return acc;
}, {});
const SUBCATEGORY_ICON_KEYS = new Set(Object.keys(SUBCATEGORY_ICON_KEY_MAP));

const getCategoryIconComponent = (category, iconKey) => {
  const key = (iconKey || category || '').toString().toLowerCase();
  if (CATEGORY_ICON_KEYS.has(key)) return CATEGORY_ICON_KEY_MAP[key];
  return Tag;
};

const getSubcategoryIconComponent = (subCategory, iconKey) => {
  const key = (iconKey || '').toString().toLowerCase();
  if (key && SUBCATEGORY_ICON_KEYS.has(key)) {
    return SUBCATEGORY_ICON_KEY_MAP[key];
  }
  if (!subCategory) return Tag;
  const value = String(subCategory).toLowerCase();
  for (const matcher of SUBCATEGORY_ICON_MATCHERS) {
    if (matcher.test instanceof RegExp) {
      if (matcher.test.test(value)) return matcher.icon;
    } else if (typeof matcher.test === 'function' && matcher.test(value)) {
      return matcher.icon;
    }
  }
  return Tag;
};

const formatLineItemsForEditor = (lineItems = []) =>
  lineItems.map((entry) => ({
    ...entry,
    price:
      entry && entry.price !== undefined && entry.price !== null
        ? String(entry.price)
        : '',
  }));

const sanitizeLineItemsForSave = (lineItems = []) =>
  lineItems.map((entry) => ({
    ...entry,
    price: parseFloat(entry.price) || 0,
    quantity: Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) > 0 ? Number(entry.quantity) : 1,
  }));

function ScanModeToggle({ mode, setMode }) {
    return (
        <div className="flex justify-center mb-4">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-full flex items-center border border-white/20">
                <button
                  onClick={() => setMode('receipt')}
                  className={`px-4 py-2 text-sm font-semibold font-playfair rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] ${
                    mode === 'receipt'
                      ? 'bg-green-500 text-white'
                      : 'bg-transparent text-white border border-white/30 hover:border-green-500 hover:text-black'
                  }`}
                >
                    Scan Receipt
                </button>
                <button
                  onClick={() => setMode('document')}
                  className={`px-4 py-2 text-sm font-semibold font-playfair rounded-full transition-colors drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] ${
                    mode === 'document'
                      ? 'bg-green-500 text-white'
                      : 'bg-transparent text-white border border-white/30 hover:border-green-500 hover:text-black'
                  }`}
                >
                    Scan Document
                </button>
            </div>
        </div>
    );
}

function ActionButton({ onClick, icon: Icon, text, isActive }) {
    const baseClasses = "w-full flex items-center justify-center py-2 px-4 rounded-full font-semibold text-sm shadow-lg transition-all duration-300 backdrop-blur-md border font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]";
    const activeClasses = "bg-green-500 text-white border-transparent";
    const inactiveClasses = "bg-white/10 border-white/20 text-white hover:border-green-500 hover:text-black hover:bg-white/20";
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

const InputWithIcon = ({
    icon: IconComponent,
    value,
    onChange,
    type = 'text',
    placeholder,
    iconClassName = 'text-gray-500 dark:text-gray-300',
    inputClassName = 'text-sm',
    ...rest
}) => {
    const displayValue = value === null || value === undefined ? '' : value;
    return (
    <div className="w-full">
        <div className="flex flex-wrap items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-2 border border-transparent focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition">
            <IconComponent className={cn('h-4 w-4', iconClassName)} />
            <input
                type={type}
                value={displayValue}
                onChange={onChange}
                placeholder={placeholder}
                aria-label={placeholder}
                className={cn('flex-1 min-w-0 bg-transparent border-none focus:outline-none text-gray-900 dark:text-gray-100', inputClassName)}
                {...rest}
            />
        </div>
    </div>
);
};

const LineItemRow = React.memo(({
    item,
    index,
    mainCategoryOptions,
    subCategoryOptionsMap,
    handleLineItemChange,
    removeLineItem,
    setMainCategoryOptions,
    setSubCategoryOptionsMap,
    saveUserCategoryPreference
}) => {
    const subCategoryOptions = subCategoryOptionsMap[item.main_category] || [];
    const CategoryIconComponent = getCategoryIconComponent(item.main_category, item.category_icon_key);
    const SubcategoryIconComponent = getSubcategoryIconComponent(item.sub_category, item.subcategory_icon_key);

    const onSubCategoryCreate = (newSub) => {
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
    };

    const onMainCategoryCreate = (newCategory) => {
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
    };

    return (
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-1 md:[grid-template-columns:1.8fr_0.35fr_0.5fr_1.7fr_1.7fr_0.4fr] gap-3 md:gap-4 items-center">

            <input type="text" value={item.item} onChange={(e) => handleLineItemChange(index, 'item', e.target.value)} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />

            <InputWithIcon
                icon={PoundSterling}
                value={item.price}
                onChange={(e) => handleLineItemChange(index, 'price', e.target.value)}
                type="number"
                placeholder="Price"
                iconClassName="text-emerald-500"
                inputClassName="text-sm font-ubuntu"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[.,]?[0-9]*"
            />

            <input
              type="number"
              value={item.quantity}
              onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm font-ubuntu text-center"
            />

            <div className="flex items-center gap-2 min-w-0">
                <SearchableDropdown
                    options={mainCategoryOptions}
                    value={item.main_category}
                    onChange={(value) => handleLineItemChange(index, 'main_category', value)}
                    placeholder="Select Category"
                    allowCreate
                    pill={false}
                    labelClassName="text-xs md:text-sm whitespace-normal break-words leading-tight"
                    className="flex-1 min-w-0"
                    onCreateOption={onMainCategoryCreate}
                />
            </div>

            <div className="flex items-center gap-2 min-w-0">
                <SearchableDropdown
                    options={subCategoryOptions}
                    value={item.sub_category}
                    onChange={(value) => handleLineItemChange(index, 'sub_category', value)}
                    placeholder="Select Subcategory"
                    allowCreate
                    pill={false}
                    labelClassName="text-xs md:text-sm whitespace-normal break-words leading-tight"
                    className="flex-1 min-w-0"
                    onCreateOption={onSubCategoryCreate}
                />
            </div>

            <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-600 justify-self-center"><MinusCircle size={20} /></button>
        </div>
    );
});
LineItemRow.displayName = 'LineItemRow';

function EditableReceipt({ data, setData, onSave, saveUserCategoryPreference, file, userStoreOverrides, isSaving }) {
    const { fetchWithAuth } = useAuth();
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
                const resp = await fetchWithAuth('/api/store-info');
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
    }, [fetchWithAuth]);

    useEffect(() => {
        const newTotal = (data.line_items || []).reduce((acc, item) => acc + ((parseFloat(item.price) || 0) * (Number(item.quantity) || 1)), 0);
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
            await fetchWithAuth('/api/user-store-type-overrides', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchant_name: data.merchant_name,
                    store_type: trimmed,
                }),
            });
        } catch (error) {
            console.error('Failed to save store type override:', error);
        }
    };

    const handleLineItemChange = useCallback((index, field, value) => {
        const normalizedValue =
            field === 'price'
                ? (typeof value === 'string' ? value.replace(/[^\d.,-]/g, '') : value)
                : (typeof value === 'string' ? value.replace(/[^a-zA-Z0-9\s]/g, '') : value);

        setData(prev => {
            const currentItems = Array.isArray(prev.line_items) ? [...prev.line_items] : [];
            if (!currentItems[index]) return prev;

            const updatedItem = { ...currentItems[index], [field]: normalizedValue };

            if (field === 'price') {
                updatedItem.price = normalizedValue;
            } else if (field === 'main_category') {
                updatedItem.sub_category = ''; // reset subcategory on main category change
                updatedItem.category_icon_key = null;
                updatedItem.subcategory_icon_key = null;
            } else if (field === 'sub_category') {
                updatedItem.subcategory_icon_key = null;
            }

            currentItems[index] = updatedItem;

            if (field === 'sub_category') {
                const preference = {
                    itemName: (updatedItem.item || updatedItem.Item_Name || '').trim(),
                    mainCategory: (updatedItem.main_category || '').trim(),
                    subCategory: (updatedItem.sub_category || '').trim(),
                };
                if (preference.itemName && preference.mainCategory && preference.subCategory) {
                    saveUserCategoryPreference(
                        preference.itemName,
                        preference.mainCategory,
                        preference.subCategory
                    );
                }
            }

            return { ...prev, line_items: currentItems };
        });
    }, [saveUserCategoryPreference]);

    const addLineItem = () => {
        setData(prev => ({
            ...prev,
            line_items: [...(prev.line_items || []), { item: '', price: '', quantity: 1, main_category: 'other', sub_category: 'miscellaneous' }]
        }));
    };

    const removeLineItem = useCallback((index) => {
        setData(prev => ({
            ...prev,
            line_items: (prev.line_items || []).filter((_, i) => i !== index),
        }));
    }, []);

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
                        <div className="flex items-center gap-3 min-w-0">
                            <MerchantLogo merchantName={data.merchant_name} />
                            <SearchableDropdown
                                options={merchantOptions}
                                value={data.merchant_name || ''}
                                onChange={updateMerchantSelection}
                                placeholder="Select merchant"
                                allowCreate
                                startIcon={<Store className="h-3.5 w-3.5 text-emerald-500" />}
                                pill
                                labelClassName="text-xs md:text-sm whitespace-normal break-words leading-tight"
                                className="flex-1 min-w-0"
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
                            inputClassName="text-xs md:text-sm font-ubuntu"
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
                            labelClassName="text-xs md:text-sm whitespace-normal break-words leading-tight"
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
                        <div className="flex flex-wrap items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-2 border border-transparent text-xs md:text-sm font-semibold font-ubuntu">
                            <span className="text-emerald-500">£</span>
                            <span>{(data.total_amount ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Receipt Items</h4>
                    <button onClick={addLineItem} className="text-green-500 hover:text-green-600"><PlusCircle size={22} /></button>
                </div>
                <div className="hidden md:grid md:[grid-template-columns:2.2fr_0.35fr_0.5fr_1.5fr_1.5fr_0.4fr] gap-3 md:gap-4 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] mb-2">
                    <div className="text-left">Item Name</div>
                    <div className="text-left">Price</div>
                    <div className="text-center">Qty</div>
                    <div className="text-center">Category</div>
                    <div className="text-center">Subcategory</div>
                    <div className="text-left"></div>
                </div>
                <div className="space-y-4">
                {(data.line_items || []).map((item, index) => (
                        <LineItemRow
                            key={index}
                            item={item}
                            index={index}
                            mainCategoryOptions={mainCategoryOptions}
                            subCategoryOptionsMap={subCategoryOptionsMap}
                            handleLineItemChange={handleLineItemChange}
                            removeLineItem={removeLineItem}
                            setMainCategoryOptions={setMainCategoryOptions}
                            setSubCategoryOptionsMap={setSubCategoryOptionsMap}
                            saveUserCategoryPreference={saveUserCategoryPreference}
                        />
                ))}
            </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                        isSaving ? 'bg-green-400/60 text-white cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        <>
                            <Save size={20} className="mr-2" />
                            Save Receipt
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function ScanReceipt() {
  const [file, setFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedDataState, setExtractedDataState] = useState(null);
  const setExtractedData = useCallback((value) => {
    setExtractedDataState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (!next) return next;
      return {
        ...next,
        line_items: formatLineItemsForEditor(next.line_items || []),
      };
    });
  }, []);
  const extractedData = extractedDataState;
  const [mode, setMode] = useState('upload');
  const [scanMode, setScanMode] = useState('receipt');
  const [markdownPreview, setMarkdownPreview] = useState(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);
  const [saveSuccessPrompt, setSaveSuccessPrompt] = useState(false);
  const fileInputRef = useRef(null);
  const savedPreferencesRef = useRef(new Set());
  const { user, userStoreOverrides, fetchWithAuth } = useAuth();
  const [idleAnimation, setIdleAnimation] = useState(null);
  const [loadingAnimation, setLoadingAnimation] = useState(null);
  const [isMultiPage, setIsMultiPage] = useState(false);
  const [isHighAccuracy, setIsHighAccuracy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const processingRef = useRef(null);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldEdit = params.get('edit');
    if (shouldEdit) {
      const dataToEdit = sessionStorage.getItem('edit-receipt-data');
      if (dataToEdit) {
        try {
          const parsed = JSON.parse(dataToEdit);
          setExtractedData(parsed);
          if (parsed.image_url || parsed.receipt_url || parsed.file_url) {
            setImagePreviewUrl(parsed.image_url || parsed.receipt_url || parsed.file_url);
          }
          setMode('upload');
        } catch (err) {
          console.error('Failed to parse receipt data for editing', err);
        } finally {
          sessionStorage.removeItem('edit-receipt-data');
        }
      }
    }
  }, [location.search, setExtractedData]);

  const persistPendingPreview = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!extractedData && !markdownPreview) return;
    try {
      const payload = {
        type: markdownPreview ? 'document' : 'receipt',
        extractedData: markdownPreview ? null : extractedData,
        markdown: markdownPreview || null,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(PENDING_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Failed to persist pending preview', err);
    }
  }, [extractedData, markdownPreview]);

  const clearPendingPreview = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(PENDING_PREVIEW_STORAGE_KEY);
  }, []);

  useEffect(() => {
    fetch('/images/Leafsblow.json')
      .then((response) => response.json())
      .then((data) => setIdleAnimation(data))
      .catch((err) => console.error('Failed to load idle animation', err));

    fetch('/images/ai-cpu-loading.json')
      .then((response) => response.json())
      .then((data) => setLoadingAnimation(data))
      .catch((err) => console.error('Failed to load processing animation', err));
  }, []);

  useEffect(() => {
    if (isProcessing && processingRef.current) {
      processingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isProcessing]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(location.search);
    const shouldResume = params.get(RESUME_QUERY_PARAM);
    if (!shouldResume) return;

    try {
      const snapshot = sessionStorage.getItem(PENDING_PREVIEW_STORAGE_KEY);
      if (snapshot) {
        const payload = JSON.parse(snapshot);
        if (payload?.type === 'receipt' && payload.extractedData) {
          setExtractedData(payload.extractedData);
          setMarkdownPreview(null);
          setScanMode('receipt');
          setMode('upload');
        } else if (payload?.type === 'document' && payload.markdown) {
          setMarkdownPreview(payload.markdown);
          setExtractedData(null);
          setScanMode('document');
          setMode('upload');
        }
      }
    } catch (err) {
      console.error('Failed to restore pending preview', err);
    } finally {
      clearPendingPreview();
      params.delete(RESUME_QUERY_PARAM);
      navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
      setShowLoginPrompt(false);
    }
  }, [location.pathname, location.search, navigate, clearPendingPreview]);

  const saveUserCategoryPreference = useCallback(async (itemName, mainCategory, subCategory) => {
    const trimmedName = (itemName || '').trim();
    const trimmedMain = (mainCategory || '').trim();
    const trimmedSub = (subCategory || '').trim();

    if (!trimmedName || !trimmedMain || !trimmedSub) return;

    const normalizedName = trimmedName.toLowerCase();
    const cacheKey = `${normalizedName}__${trimmedMain.toLowerCase()}__${trimmedSub.toLowerCase()}`;
    if (savedPreferencesRef.current.has(cacheKey)) return;

    try {
        const response = await fetchWithAuth('/api/update-user-category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: normalizedName,
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
}, [fetchWithAuth]);


  const processFile = async (fileToProcess) => {
    if (!fileToProcess) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', fileToProcess);
    formData.append('scanMode', scanMode);
    formData.append('highAccuracy', String(isHighAccuracy));
    let pendingExtractedData = null;
    let pendingMarkdown = null;
    try {
      const resp = await fetchWithAuth('/api/scan', {
        method: 'POST',
        body: formData,
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

  const handleLoginRedirect = useCallback(() => {
    persistPendingPreview();
    setShowLoginPrompt(false);
    navigate(`/login?redirect=${encodeURIComponent('/scan?resume=1')}`);
  }, [navigate, persistPendingPreview]);

  const closeLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setMarkdownPreview(null);
    setMode('upload');
    setDuplicatePrompt(null);
    setSaveSuccessPrompt(false);
    clearPendingPreview();
  };
  
  const handleSave = async (options = {}) => {
    if (!extractedData || !Array.isArray(extractedData.line_items)) {
      alert('No receipt data to save.');
      return;
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const isEditing = extractedData && extractedData.id;

    if (isEditing) {
        options.existingReceiptId = extractedData.id;
        options.duplicateAction = 'replace';
    }

    if (!extractedData.canonical_merchant_id && extractedData.selectedMerchantId) {
      const aliasSource = extractedData.merchant_alias || extractedData.merchant_name || '';
      const alias = normalizeMerchantName(aliasSource);
      if (alias) {
        try {
          fetchWithAuth('/api/merchant-aliases', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              alias,
              merchant_id: extractedData.selectedMerchantId,
            }),
          }).catch(async (error) => {
            console.error('Failed to save merchant alias:', error);
          });
        } catch (error) {
          console.error('Failed to save merchant alias:', error);
        }
      }
    }

    const preparedReceipt = {
      ...extractedData,
      line_items: sanitizeLineItemsForSave(extractedData.line_items || []),
      transaction_date: extractedData.transaction_date || new Date().toISOString().split('T')[0],
    };
    const formData = new FormData();
    formData.append('receiptData', JSON.stringify(preparedReceipt));
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
      setIsSaving(true);
      const response = await fetchWithAuth('/api/receipts', {
        method: 'POST',
        body: formData,
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

      handleReset();
      setSaveSuccessPrompt(true);
    } catch (error) { 
      console.error(error);
      alert(`Failed to save receipt: ${error.message}`);
    } finally {
      setIsSaving(false);
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
              Your receipt has been stored successfully. Would you like to scan another?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSaveSuccessPrompt(false)}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={() => navigate('/insights')}
                className="w-full rounded-xl bg-gray-600 px-4 py-3 text-white font-semibold hover:bg-gray-700 transition-colors"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {isSaving && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 px-6 py-4 text-white shadow-2xl">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="text-sm font-medium">Saving receipt…</span>
          </div>
        </div>
      )}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
            <h2 className="text-2xl font-semibold mb-2">Login required</h2>
            <p className="text-sm text-slate-300">
              Sign in to save this receipt to your account. We&apos;ll keep your current scan ready so you can pick up
              right where you left off.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={closeLoginPrompt}
                className="w-full rounded-xl border border-white/20 px-4 py-2 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleLoginRedirect}
                className="w-full rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                Login to save
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
          .dark-bg { background: #000; width: 100%; }
      `}</style>

      <div
        className="dark-bg pt-4 md:pt-6 pb-12 min-h-screen overflow-y-auto"
        style={{
          backgroundImage: "url('/images/ScanPageBackgroundImage.svg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {isCameraOpen && <CameraView onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}

        {extractedData ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full font-playfair text-black dark:text-white drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                    <div className="text-center mb-5">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
                        <h1 className="text-3xl md:text-4xl font-bold text-black dark:text-white drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Review & Edit</h1>
                    </div>
                    <EditableReceipt
                        data={extractedData}
                        setData={setExtractedData}
                        onSave={handleSave}
                        saveUserCategoryPreference={saveUserCategoryPreference}
                        file={file}
                        userStoreOverrides={userStoreOverrides}
                        isSaving={isSaving}
                    />
                    <button onClick={() => window.location.href = createPageUrl('ScanReceipt')} className="mt-8 w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors">Scan Another</button>
                </div>
            </div>
        ) : markdownPreview ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full">
                    <DocumentPreview markdown={markdownPreview} onApprove={() => {}} onCancel={handleReset} />
                </div>
            </div>
        ) : (
            <div className="p-6 md:p-8 lg:p-10 flex flex-col items-center text-center min-h-[calc(100vh-8rem)] justify-start font-roboto">
                <div className="relative overflow-hidden max-w-2xl w-full bg-white/15 backdrop-blur-md p-8 rounded-2xl font-roboto border border-black/10 shadow-lg shadow-black/10">
                    {idleAnimation && (
                      <div className="pointer-events-none absolute inset-0 opacity-25">
                        <Lottie
                          animationData={idleAnimation}
                          loop={true}
                          style={{ width: '100%', height: '100%' }}
                          rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                        />
                      </div>
                    )}
                    <div className="relative z-10">
                    <ScanModeToggle mode={scanMode} setMode={setScanMode} />
                    <p className="text-md font-normal font-playfair text-gray-600 mb-8 drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                      Choose your input method to get started.
                    </p>

                    {file ? (
                        <div className="bg-white/80 p-6 rounded-2xl w-full text-left text-gray-900 border border-black/10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">Uploaded File</h3>
                                <button
                                  onClick={() => {
                                    setFile(null);
                                    setExtractedData(null);
                                    setMarkdownPreview(null);
                                  }}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center p-4 bg-white/60 rounded-lg">
                                <FileText size={24} className="text-green-600 mr-4" />
                                <div>
                                    <p className="text-md font-normal font-playfair text-gray-900 drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">{file.name}</p>
                                    <p className="text-sm font-normal font-ubuntu text-gray-900">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>

                            {isProcessing && (
                                <div ref={processingRef} className="flex flex-col items-center justify-center mt-6">
                                    {loadingAnimation && <Lottie animationData={loadingAnimation} loop={true} style={{ width: 300, height: 300 }} />}
                                    <p className="text-gray-900 mt-4 font-playfair drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">AI Is Reading Your Receipt</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                          className="rounded-2xl p-10 text-center cursor-pointer transition-colors bg-white/10 relative overflow-hidden border border-black/10"
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={handleUploadClick}
                          style={{ minHeight: '260px' }}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf"/>
                            <div className="relative z-10 flex flex-col items-center justify-end h-full pt-24 pb-2">
                              <Upload size={48} className="text-purple-600 mb-2 mx-auto" />
                              <p className="text-md font-normal font-playfair text-gray-600 drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                                Drag & Drop or Click to Upload
                              </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-900">
                      <label htmlFor="multi-page-toggle" className="flex items-center gap-2 cursor-pointer select-none font-playfair font-semibold drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                        <input
                          id="multi-page-toggle"
                          type="checkbox"
                          checked={isMultiPage}
                          onChange={handleMultiPageToggle}
                          className="h-4 w-4 rounded border-gray-400 bg-transparent"
                        />
                        Multiple pages?
                      </label>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-800 font-playfair">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsHighAccuracy((prev) => !prev)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            isHighAccuracy ? 'bg-sky-500' : 'bg-white/20'
                          }`}
                          aria-pressed={isHighAccuracy}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              isHighAccuracy ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className="text-purple-600 text-xs font-semibold tracking-[0.2em] uppercase drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] font-playfair">High Accuracy</span>
                      </div>
                      <span className="text-xs text-purple-600 font-semibold tracking-[0.2em] uppercase drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)] font-playfair">
                        {isHighAccuracy ? 'Best detail, slightly slower' : 'Faster processing'}
                      </span>
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
                    </div>
                </div>
            </div>
        )}
      </div>
    </>
  );
}
