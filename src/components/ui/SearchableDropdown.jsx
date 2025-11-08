import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder,
  allowCreate = false,
  onCreateOption,
  startIcon,
  pill = false,
  className,
  buttonClassName,
  labelClassName,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const availableOptions = Array.isArray(options) ? options : [];
  const normalizedOptions = availableOptions.map((option) =>
    typeof option === 'string' ? option : String(option)
  );

  const filteredOptions = normalizedOptions.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const trimmedTerm = searchTerm.trim();
  const hasExactMatch = normalizedOptions.some(
    (option) => option.toLowerCase() === trimmedTerm.toLowerCase()
  );
  const showCreateOption = allowCreate && Boolean(trimmedTerm) && !hasExactMatch;

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreate = () => {
    if (!showCreateOption) return;
    const newOption = trimmedTerm;
    if (onCreateOption) {
      onCreateOption(newOption);
    }
    onChange(newOption);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (showCreateOption) {
        handleCreate();
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      }
    }
  };

  const baseButtonClasses =
    'w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 flex justify-between items-center text-left transition-colors';
  const pillClasses =
    'rounded-full bg-gray-100 dark:bg-gray-700 border border-transparent px-4 py-2 hover:border-green-500 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/30';
  const regularClasses =
    'hover:border-green-500 focus-visible:border-green-500 focus-visible:ring-2 focus-visible:ring-green-500/30';

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        type="button"
        className={cn(
          baseButtonClasses,
          pill ? pillClasses : regularClasses,
          buttonClassName
        )}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={cn('truncate flex items-center gap-2', labelClassName || 'text-sm')}>
          {startIcon ? <span className="shrink-0">{startIcon}</span> : null}
          {value || placeholder || 'Select...'}
        </span>
        <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filteredOptions.map((option, index) => (
              <li
                key={`${option}-${index}`}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                onClick={() => handleSelect(option)}
              >
                {option}
              </li>
            ))}
            {showCreateOption && (
              <li
                key="create-option"
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 cursor-pointer flex items-center gap-2"
                onClick={handleCreate}
              >
                <PlusCircle size={16} />
                <span>Create “{trimmedTerm}”</span>
              </li>
            )}
            {allowCreate && !trimmedTerm && (
              <li
                key="prompt-create"
                className="p-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 cursor-pointer flex items-center gap-2"
                onClick={() => {
                  const manualEntry = window.prompt('Add a new option');
                  const trimmed = manualEntry ? manualEntry.trim() : '';
                  if (!trimmed) return;
                  if (onCreateOption) {
                    onCreateOption(trimmed);
                  }
                  onChange(trimmed);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                <PlusCircle size={16} />
                <span>Add a new option…</span>
              </li>
            )}
            {!filteredOptions.length && !showCreateOption && (
              <li className="p-2 text-sm text-gray-500 dark:text-gray-300 italic select-none">
                No matches
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
