import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, FileText, X, Loader, CheckCircle, Save, ArrowLeft, Mic, Edit, RefreshCw, PlusCircle, MinusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import CameraView from '../components/CameraView';
import { SUB_CATEGORIES } from '../utils/categorize';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import MerchantLogo from '../components/ui/MerchantLogo';
import VoiceInput from '../components/ui/VoiceInput';
import StoreType from '../components/ui/StoreType';

function EditableReceipt({ data, setData, onSave, onReprocess, isReprocessing }) {
    useEffect(() => {
        const newTotal = (data.line_items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
        setData(prev => ({ ...prev, total_amount: newTotal }));
    }, [data.line_items]);

    const handleFieldChange = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleLineItemChange = (index, field, value) => {
        setData(prev => {
            const newLineItems = [...prev.line_items];
            const updatedItem = { ...newLineItems[index], [field]: value };
            if (field === 'main_category') {
                updatedItem.sub_category = ''; // Reset subcategory when category changes
            }
            newLineItems[index] = updatedItem;
            return { ...prev, line_items: newLineItems };
        });
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
            line_items: prev.line_items.filter((_, i) => i !== index)
        }));
    };

    const mainCategoryOptions = Object.keys(SUB_CATEGORIES);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full text-left space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Merchant</label>
                    <div className="flex items-center gap-2">
                        <MerchantLogo merchantName={data.merchant_name} />
                        <input type="text" value={data.merchant_name} onChange={(e) => handleFieldChange('merchant_name', e.target.value)} className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-transparent focus:border-green-500 text-sm" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                    <input type="date" value={data.transaction_date} onChange={(e) => handleFieldChange('transaction_date', e.target.value)} className="w-full p-2 rounded-lg bg-gray-100 dark:bg-ray-700 border border-transparent focus:border-green-500 text-sm" />
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</label>
                        <StoreType merchantName={data.merchant_name} />
                    </div>
                    <input type="text" value={`£${data.total_amount?.toFixed(2)}`} readOnly className="w-full p-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-transparent focus:outline-none text-sm font-semibold" />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Line Items</h4>
                    <button onClick={addLineItem} className="text-green-500 hover:text-green-600">
                        <PlusCircle size={22} />
                    </button>
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
                        const subCategoryOptions = SUB_CATEGORIES[item.main_category] || [];
                        return (
                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                                <input type="text" placeholder="Item Name" value={item.item} onChange={(e) => handleLineItemChange(index, 'item', e.target.value)} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm md:col-span-2" />
                                <input type="number" placeholder="Price" value={item.price} onChange={(e) => handleLineItemChange(index, 'price', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />
                                <input type="number" placeholder="Quantity" value={item.quantity} onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value))} className="w-full p-2 rounded-lg bg-white dark:bg-gray-600 border border-transparent focus:border-green-500 text-sm" />
                                <SearchableDropdown options={mainCategoryOptions} value={item.main_category} onChange={(value) => handleLineItemChange(index, 'main_category', value)} placeholder="Select Category" />
                                <SearchableDropdown options={subCategoryOptions} value={item.sub_category} onChange={(value) => handleLineItemChange(index, 'sub_category', value)} placeholder="Select Subcategory" />
                                <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-600 justify-self-center">
                                    <MinusCircle size={20} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="flex gap-4 mt-6">
                <button onClick={onSave} className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center justify-center">
                    <Save size={20} className="mr-2"/>
                    Save Receipt
                </button>
                <button onClick={onReprocess} disabled={isReprocessing} className="w-full bg-purple-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center">
                    {isReprocessing ? <><Loader size={20} className="animate-spin mr-2"/> Re-processing...</> : <><RefreshCw size={20} className="mr-2"/> Re-process</>}
                </button>
            </div>
        </div>
    );
}


export default function ScanReceipt() {
  const [file, setFile] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [mode, setMode] = useState('upload'); // upload, manual, voice
  const fileInputRef = useRef(null);

  const handleManualEntry = () => {
    setMode('manual');
    setExtractedData({
        merchant_name: '',
        transaction_date: new Date().toISOString().split('T')[0],
        line_items: [{ item: '', price: 0, quantity: 1, main_category: 'other', sub_category: 'miscellaneous' }],
        total_amount: 0,
    });
  }

  const handleVoiceEntry = () => {
      setMode('voice');
      setExtractedData(null);
  }

  const handleVoiceComplete = (data) => {
      setExtractedData(data);
      setMode('manual'); // Switch to manual mode for editing
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setMode('upload');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setExtractedData(null);
      setMode('upload');
    }
  };

  const openFileDialog = () => {
    fileInputRef.current.click();
  };

  const handleTakePhoto = () => {
    setIsCameraOpen(true);
    setMode('camera');
  };

  const handleCapture = (capturedFile) => {
    setFile(capturedFile);
    setExtractedData(null);
    setIsCameraOpen(false);
    setMode('upload');
  };

  const handleCloseCamera = () => {
    setIsCameraOpen(false);
  };

  const handleProcessReceipt = async () => {
    if (!file) return;
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const resp = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        throw new Error('The server returned an error.');
      }

      const data = await resp.json();
      setExtractedData(data);
    } catch (error) {
      console.error(error);
      alert(`Failed to process image: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReprocess = async () => {
    if (!file) return;
    setIsReprocessing(true);

    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('reprocess', 'true');

    try {
      const resp = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });

      if (!resp.ok) {
        throw new Error('The server returned an error.');
      }

      const data = await resp.json();
      setExtractedData(data);
    } catch (error) {
      console.error(error);
      alert(`Failed to re-process image: ${error.message}`);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setMode('upload');
  }

  const handleSave = () => {
      const savedReceipts = JSON.parse(localStorage.getItem('receipts') || '[]');
      const newReceipt = { ...extractedData, id: new Date().toISOString() };
      const updatedReceipts = [...savedReceipts, newReceipt];
      localStorage.setItem('receipts', JSON.stringify(updatedReceipts));
      alert('Receipt saved successfully!');
      handleReset();
  }

  return (
    <>
        <style>{`
            .gradient-bg {
                background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
                background-size: 400% 400%;
                animation: gradient 15s ease infinite;
                width: 100%;
                min-height: calc(100vh - 4rem);
            }

            @keyframes gradient {
                0% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
                100% {
                    background-position: 0% 50%;
                }
            }
            .pulsing-border {
                animation: pulse-border 2s infinite;
            }

            @keyframes pulse-border {
                0% {
                    border-color: rgba(209, 213, 219, 0.5);
                }
                50% {
                    border-color: rgba(52, 152, 219, 1);
                }
                100% {
                    border-color: rgba(209, 213, 219, 0.5);
                }
            }
        `}</style>
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft size={20} className="mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Scan Receipt</h1>
            </div>
            <div className="w-1/3"></div>
          </div>
        </div>
      </nav>
      <div className="gradient-bg">
        {isCameraOpen && <CameraView onCapture={handleCapture} onClose={handleCloseCamera} />}

        {extractedData ? (
            <div className="p-6 md:p-10 flex flex-col items-center h-full">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-8">
                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                        <h1 className="text-3xl md:text-4xl font-bold text-white">Review & Edit</h1>
                    </div>
                    <EditableReceipt 
                        data={extractedData} 
                        setData={setExtractedData} 
                        onSave={handleSave} 
                        onReprocess={handleReprocess}
                        isReprocessing={isReprocessing}
                    />
                    <button onClick={handleReset} className="mt-8 w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                        Scan Another Receipt
                    </button>
                </div>
            </div>
        ) : (
            <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center h-full">
                {mode === 'voice' ? (
                    <VoiceInput onComplete={handleVoiceComplete} />
                ) : (
                    <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md p-8 rounded-2xl">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Scan Your Receipt</h1>
                        <p className="text-md text-gray-200 mb-8">
                            Upload a document or image of your receipt to get started.
                        </p>

                        {file ? (
                            <div className="bg-white/20 p-6 rounded-2xl w-full text-left">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Uploaded File</h3>
                                <button onClick={() => setFile(null)} className="text-gray-300 hover:text-white">
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
                            <button onClick={handleProcessReceipt} disabled={isProcessing} className="mt-6 w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                                {isProcessing ? <><Loader size={20} className="animate-spin mr-2"/> Processing...</> : 'Process Receipt'}
                            </button>
                            </div>
                        ) : (
                            <div 
                            className="border-2 border-dashed border-gray-300/50 rounded-2xl p-10 md:p-16 text-center cursor-pointer transition-colors hover:border-green-400 bg-white/10 pulsing-border"
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={openFileDialog}
                            >
                            <div className="flex flex-col items-center">
                                <Upload size={48} className="text-gray-300 mb-4" />
                                <p className="text-lg font-semibold text-white mb-2">
                                Drag & Drop your file here
                                </p>
                                <p className="text-sm text-gray-400 mb-6">or click to browse</p>
                                <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*,application/pdf"
                                />
                            </div>
                            </div>
                        )}

                        {!file && (
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 justify-center">
                                <button 
                                    onClick={openFileDialog}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-6 rounded-full font-semibold shadow-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <Upload size={20} className="mr-2"/>
                                    Upload
                                </button>
                                <button 
                                    onClick={handleTakePhoto}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-6 rounded-full font-semibold shadow-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <Camera size={20} className="mr-2"/>
                                    Camera
                                </button>
                                <button 
                                    onClick={handleManualEntry}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-6 rounded-full font-semibold shadow-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <Edit size={20} className="mr-2"/>
                                    Manual Entry
                                </button>
                                <button 
                                    onClick={handleVoiceEntry}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 px-6 rounded-full font-semibold shadow-lg hover:bg-white/20 transition-colors flex items-center justify-center"
                                >
                                    <Mic size={20} className="mr-2"/>
                                    Voice Mode
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </>
  );
}