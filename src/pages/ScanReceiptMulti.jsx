import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Upload, Camera } from 'lucide-react';
import { createPageUrl } from '@/utils';
import CameraView from '@/components/CameraView';
import { useAuth } from '@/hooks/useAuth';

const MIN_FILES = 2;
const MAX_FILES = 10;

const buildPreview = (file, index) => ({
  id: `${Date.now()}-${index}-${file.name}`,
  file,
});

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
};

export default function ScanReceiptMulti() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const navigate = useNavigate();
  const { fetchWithAuth } = useAuth();
  const isMobile = useIsMobile();
  const pageBackgroundStyle = useMemo(() => ({
    backgroundImage: "url('/images/ScanPageBackgroundImage.svg')",
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }), []);
  const actionBaseClasses = "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-300 backdrop-blur-md border font-playfair";
  const primaryActionClasses = `${actionBaseClasses} bg-emerald-500 text-white border-transparent hover:bg-emerald-600`;
  const secondaryActionClasses = `${actionBaseClasses} bg-white/10 border-white/20 text-white hover:bg-white/20`;

  const handleFileSelect = (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;

    setFiles((prev) => {
      const baseFiles = [...prev];
      const startIndex = baseFiles.length;
      const nextFiles = selected.map((file, index) => buildPreview(file, startIndex + index));
      const combined = [...baseFiles, ...nextFiles];

      if (combined.length > MAX_FILES) {
        setError(`You can only add up to ${MAX_FILES} pages.`);
        return prev;
      }

      if (combined.length < MIN_FILES) {
        setError(`Select at least ${MIN_FILES} pages (up to ${MAX_FILES}).`);
      } else {
        setError('');
      }

      return combined;
    });

    // Allow selecting the same file again after an interaction
    event.target.value = '';
  };

  const handleReorder = (targetIndex) => {
    if (dragIndexRef.current === null || dragIndexRef.current === targetIndex) return;
    setFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndexRef.current, 1);
      updated.splice(targetIndex, 0, moved);
      dragIndexRef.current = targetIndex;
      return updated;
    });
  };

  const handleCameraCapture = (capturedFile) => {
    setIsCameraOpen(false);
    if (!capturedFile) return;
    setFiles((prev) => {
      if (prev.length >= MAX_FILES) {
        setError(`You can only capture up to ${MAX_FILES} pages.`);
        return prev;
      }
      setError('');
      return [...prev, buildPreview(capturedFile, prev.length)];
    });
  };

  const handleCameraClick = () => {
    if (isMobile) {
      fileInputRef.current?.click();
      return;
    }
    setIsCameraOpen(true);
  };

  const handleProcess = async () => {
    if (files.length < MIN_FILES) {
      setError(`Select at least ${MIN_FILES} images before processing.`);
      return;
    }
    setIsProcessing(true);
    setError('');
    const formData = new FormData();
    files.forEach(({ file }) => {
      formData.append('files', file, file.name);
    });
    try {
      const resp = await fetchWithAuth('/api/scan-multi', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to process multi-page receipt');
      }
      const data = await resp.json();
      sessionStorage.setItem('multi-scan-result', JSON.stringify(data));
      navigate(createPageUrl('ScanReceipt'));
      return;
    } catch (err) {
      setError(err.message || 'Failed to process receipt');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
    <div
      className="scan-scope pt-8 md:pt-12 pb-12 min-h-screen overflow-y-auto font-playfair"
      style={pageBackgroundStyle}
    >
      <div className="p-6 md:p-8 lg:p-10 flex flex-col items-center text-center min-h-[calc(100vh-8rem)] justify-start w-full">
        <div className="relative max-w-xl w-full min-h-[520px] bg-white/20 backdrop-blur-2xl border border-white/30 shadow-2xl p-8 rounded-3xl overflow-hidden text-black">
          <div className="flex flex-col items-center text-center gap-3 font-playfair">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black shadow-sm"
              aria-label="Multi-page scan"
            >
              Multi-page
            </button>
            <h1 className="text-3xl md:text-4xl font-bold text-black">Scan Multi-Page Receipts</h1>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

            {error && (
              <p className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-8 max-w-xl w-full mx-auto">
              <div>
              <div
                className="rounded-2xl p-10 text-center cursor-pointer transition-colors bg-white/25 backdrop-blur-2xl shadow-xl mt-6"
              >
                  {files.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center text-center cursor-pointer text-black/80 gap-3"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                  >
                    <Upload size={40} className="text-emerald-500" />
                    <p className="text-lg font-semibold text-black drop-shadow-[0_1px_1px_rgba(34,197,94,0.5)]">
                      Drag & Drop or Click to Upload
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {files.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 shadow-lg shadow-black/10 backdrop-blur-md"
                          draggable
                          onDragStart={() => { dragIndexRef.current = index; }}
                          onDragEnter={(event) => { event.preventDefault(); handleReorder(index); }}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnd={() => { dragIndexRef.current = null; }}
                        >
                          <div className="flex flex-col gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-black/60">Page {index + 1}</span>
                          <p className="text-sm font-medium text-black truncate">{item.file.name}</p>
                          <p className="text-xs text-black/60">{(item.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== index))}
                            className="rounded-full bg-black/70 p-1 text-white"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl('ScanReceipt'))}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500 hover:text-white"
                  >
                    Switch to single-page scan
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-4 text-sm">
                  <div className="flex flex-col gap-3 items-center text-center">
                  <p className="text-black/70">
                    Selected {files.length || 0} page{files.length === 1 ? '' : 's'} (min {MIN_FILES}).
                  </p>
                  {!isMobile && (
                    <div className="flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={primaryActionClasses}
                      >
                        <Upload size={14} /> Choose images
                      </button>
                      <button
                        onClick={handleCameraClick}
                        className={secondaryActionClasses}
                      >
                        <Camera size={14} /> Use camera
                      </button>
                    </div>
                  )}
                </div>
                  {files.length > 0 && (
                    <div className="flex justify-center">
                    <button
                      disabled={isProcessing || files.length < MIN_FILES}
                      onClick={handleProcess}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition disabled:cursor-not-allowed disabled:bg-emerald-500/50"
                    >
                      {isProcessing ? 'Processing…' : 'Process'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            </div>
          </div>
        </div>
      </div>
      {isCameraOpen && (
        <CameraView
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </>
  );
}
