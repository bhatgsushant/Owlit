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

export default function ScanReceiptMulti() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const navigate = useNavigate();
  const { fetchWithAuth } = useAuth();

  const handleFileSelect = (event) => {
    const selected = Array.from(event.target.files || []);
    selected.forEach((item) => item && item.size); // touch for lint
    if (!selected.length) return;
    if (selected.length < MIN_FILES || selected.length > MAX_FILES) {
      setError(`Please choose between ${MIN_FILES} and ${MAX_FILES} pages.`);
      setFiles([]);
      return;
    }
    setError('');
    setFiles(selected.map((file, index) => buildPreview(file, index)));
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
      className="min-h-screen flex items-start justify-center pt-16 font-playfair"
      style={{
        backgroundImage: "url('/images/ScanPageBackgroundImage.svg')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full px-4 pb-16" style={{ maxWidth: 'min(1100px, 90vw)' }}>
        <div className="relative rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-10 shadow-[0_35px_120px_rgba(0,0,0,0.12)] backdrop-blur-[18px] text-black">
          <div className="flex flex-col items-center text-center gap-3 font-playfair">
            <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-black/70">
              Multi-page
            </span>
            <h1 className="text-3xl md:text-4xl font-semibold text-black">Scan multi-page receipts</h1>
            <p className="text-sm md:text-base text-black/70 max-w-2xl">
              Upload or capture 2–10 pages, reorder them, then process to continue in the standard scan flow.
            </p>
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

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div>
              <div className="border-2 border-dashed border-emerald-500/30 rounded-3xl p-10 min-h-[260px] flex items-center justify-center text-center bg-emerald-500/5 backdrop-blur-md shadow-2xl shadow-black/10">
                  {files.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center text-center cursor-pointer text-black/80 gap-3"
                  >
                    <Upload size={40} className="text-emerald-500" />
                    <p className="text-lg font-semibold text-black">Drag & drop pages or click to choose files</p>
                    <p className="text-sm text-black/60">Supports images or PDF · between {MIN_FILES} and {MAX_FILES} pages</p>
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
                <div className="mt-6 flex flex-col gap-4 text-sm">
                  <div className="flex flex-col gap-3 items-center text-center">
                  <p className="text-black/70">
                    Selected {files.length || 0} page{files.length === 1 ? '' : 's'} (min {MIN_FILES}).
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-500/80 hover:text-black"
                    >
                      <Upload size={14} /> Choose images
                    </button>
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-black/70 transition hover:bg-emerald-500 hover:border-emerald-500 hover:text-white"
                    >
                      <Camera size={14} /> Use camera
                    </button>
                  </div>
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

            <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-black/80 shadow-lg shadow-black/10 backdrop-blur-md text-center">
              <h2 className="text-lg font-semibold text-black">How it works</h2>
              <ol className="mt-3 space-y-2 text-sm text-black/70 list-decimal list-inside text-left inline-block">
                <li>Upload the pages in the order you want them read.</li>
                <li>Drag any card to reorder before submitting.</li>
                <li>Hit “Process” and we’ll open the preview in the standard scan flow.</li>
              </ol>
              <p className="mt-4 text-xs text-black/60">Once processed, you’ll edit and save the receipt from the usual screen.</p>
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
