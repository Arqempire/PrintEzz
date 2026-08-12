'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Printer,
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Plus,
  Zap,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Copy,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { Shop, PrintSettings, ColorMode, PrintJob } from '@/lib/types';
import { calculatePrintPrice, isShopOnline } from '@/lib/pricing';
import { supabaseClient } from '@/lib/supabase/client';
import { safeFetchJson } from '@/lib/api-client';

export default function CustomerShopPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = (params?.shop_id as string) || 'demo-shop';

  // Core state
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [activeStep, setActiveStep] = useState<'upload' | 'settings' | 'pay' | 'status'>('upload');
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [r2FileKey, setR2FileKey] = useState<string | null>(null);
  const [uploadedPublicUrl, setUploadedPublicUrl] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<PrintSettings>({
    copies: 1,
    color_mode: 'bw',
    duplex: false,
    page_size: 'A4',
    page_range: 'all',
  });

  // Created Job & Payment state
  const [createdJob, setCreatedJob] = useState<PrintJob | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [paymentSimulating, setPaymentSimulating] = useState(false);
  const [queueAheadCount, setQueueAheadCount] = useState<number>(0);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch Shop details & heartbeat status
  const fetchShopDetails = async () => {
    try {
      setLoadingShop(true);
      const data = await safeFetchJson<{ shop?: Shop; queuedJobsCount?: number }>('/api/shop/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      });
      if (data.shop) {
        setShop(data.shop);
        setQueueAheadCount(data.queuedJobsCount || 0);
      }
    } catch (err) {
      console.error('Error fetching shop:', err);
    } finally {
      setLoadingShop(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();
    const interval = setInterval(fetchShopDetails, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [shopId]);

  // Realtime subscription when job created
  useEffect(() => {
    if (!createdJob) return;

    // Listen to job status changes via Supabase Realtime
    const channel = supabaseClient
      .channel(`job_${createdJob.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_jobs',
          filter: `id=eq.${createdJob.id}`,
        },
        (payload) => {
          console.log('[Realtime] Job updated:', payload.new);
          setCreatedJob(payload.new as PrintJob);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [createdJob?.id]);

  // Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);

    // Generate local preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }

    // Process file server-side to extract PDF page count or auto-convert images
    try {
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', file);

      // Step A: Server-side page counting & image conversion
      const processData = await safeFetchJson<{ pageCount?: number }>('/api/upload/process', {
        method: 'POST',
        body: formData,
      });

      if (processData.pageCount) {
        setPageCount(processData.pageCount);
      }

      setUploadProgress(35);

      // Step B: Get presigned upload URL
      const { uploadUrl, fileKey, publicUrl } = await safeFetchJson<{
        uploadUrl: string;
        fileKey: string;
        publicUrl: string;
      }>('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/pdf',
        }),
      });

      setR2FileKey(fileKey);
      setUploadedPublicUrl(publicUrl);

      setUploadProgress(45);

      // Step C: Direct upload with real-time XHR progress tracking
      if (uploadUrl && uploadUrl.startsWith('http')) {
        await new Promise<void>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const filePct = Math.round((event.loaded / event.total) * 50); // scale 45% -> 95%
              setUploadProgress(45 + filePct);
            }
          };

          xhr.onload = () => resolve();
          xhr.onerror = () => resolve(); // fallback gracefully
          xhr.send(file);
        });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setActiveStep('settings');
        setUploading(false);
      }, 300);
    } catch (err: any) {
      console.error('File upload process error:', err);
      alert('Error uploading file: ' + (err.message || 'Please try again.'));
      setUploading(false);
    }
  };

  // Pricing calculation
  const currentPricing = calculatePrintPrice(
    shop || { price_per_page_bw: 2, price_per_page_color: 10 },
    pageCount,
    settings.copies,
    settings.color_mode
  );

  const online = isShopOnline(shop?.last_seen);

  // Submit Job & Proceed to Payment
  const handleProceedToPayment = async () => {
    if (!selectedFile) return;

    try {
      setCreatingJob(true);

      const data = await safeFetchJson<{ job: PrintJob }>('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          fileUrl: uploadedPublicUrl || r2FileKey || `mock_${selectedFile.name}`,
          fileName: selectedFile.name,
          pageCount,
          copies: settings.copies,
          colorMode: settings.color_mode,
          duplex: settings.duplex,
          pageRange: settings.page_range,
        }),
      });

      setCreatedJob(data.job);
      setActiveStep('pay');
    } catch (err: any) {
      alert(err.message || 'Could not create order. Please try again.');
    } finally {
      setCreatingJob(false);
    }
  };

  // Simulate Payment for Demo/Testing
  const handleSimulatePayment = async () => {
    if (!createdJob) return;

    try {
      setPaymentSimulating(true);

      const data = await safeFetchJson<{ job: PrintJob }>('/api/jobs/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: createdJob.id }),
      });

      if (data.job) {
        setCreatedJob(data.job);
        setActiveStep('status');
      }
    } catch (err: any) {
      alert('Payment simulation error: ' + err.message);
    } finally {
      setPaymentSimulating(false);
    }
  };

  if (loadingShop) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Connecting to print shop...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-4">
      {/* Top Bar / Header */}
      <header className="mb-4 pb-3 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 leading-tight">
              {shop?.name || 'Self-Service Print Shop'}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="inline-flex items-center text-xs">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={online ? 'text-emerald-400 font-medium' : 'text-rose-400'}>
                  {online ? 'Online & Ready' : 'Shop Offline'}
                </span>
              </span>
              {online && queueAheadCount > 0 && (
                <span className="text-[11px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded-full">
                  {queueAheadCount} in queue
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={fetchShopDetails}
          className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh Shop Status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center space-y-4">
        {/* Offline Warning Blocking Container */}
        {!online && (
          <div className="glass-card p-6 rounded-2xl text-center border-rose-500/30 bg-rose-950/20 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-900/40 border border-rose-700/40 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Shop PC Offline</h2>
            <p className="text-xs text-slate-400 mb-4">
              The shopkeeper's printing terminal is currently disconnected or updating. Please notify the counter staff to resume print service.
            </p>
            <button
              onClick={fetchShopDetails}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status Again</span>
            </button>
          </div>
        )}

        {/* Online Flow Steps */}
        {online && (
          <>
            {/* STEP 1: FILE UPLOAD */}
            {activeStep === 'upload' && (
              <div className="space-y-4 my-auto">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Step 1 of 3</span>
                  <h2 className="text-xl font-bold text-slate-100">Upload your Document</h2>
                  <p className="text-xs text-slate-400">PDF, DOCX, JPG or PNG (up to 20MB)</p>
                </div>

                {/* Upload Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-card glass-card-hover p-6 rounded-2xl border-dashed border-2 border-indigo-500/30 hover:border-indigo-500/60 text-center cursor-pointer relative overflow-hidden group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-sm text-slate-200">Tap to browse files</h3>
                  <p className="text-[11px] text-slate-400 mt-1">or drag and drop document here</p>

                  {uploading && (
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-3 z-20">
                      <div className="w-10 h-10 rounded-full bg-indigo-900/60 border border-indigo-500/40 text-indigo-400 flex items-center justify-center animate-spin">
                        <RefreshCw className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="text-center space-y-1 max-w-[240px]">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {selectedFile?.name || 'Document'}
                        </p>
                        <p className="text-[11px] text-indigo-300 font-medium">
                          {uploadProgress < 35
                            ? 'Processing file & counting pages...'
                            : uploadProgress < 95
                            ? `Uploading to secure storage (${uploadProgress}%)`
                            : 'Upload complete!'}
                        </p>
                      </div>

                      {/* Progress Bar with glowing indicator */}
                      <div className="w-full max-w-[240px] space-y-1">
                        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-indigo-500/30">
                          <div
                            className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full rounded-full transition-all duration-200 shadow-lg shadow-indigo-500/50"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>
                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                          </span>
                          <span className="text-indigo-400 font-bold">{uploadProgress}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Camera Capture Button for Physical Docs */}
                <div className="relative">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-3.5 px-4 glass-card glass-card-hover rounded-xl border border-slate-700/60 text-slate-200 font-medium text-sm flex items-center justify-center space-x-2 text-indigo-300 hover:text-indigo-200"
                  >
                    <Camera className="w-5 h-5 text-indigo-400" />
                    <span>Take Photo of Physical Document</span>
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-400 pt-2">
                  <span className="flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                    Auto-deleted in 24h
                  </span>
                  <span className="flex items-center">
                    <Zap className="w-3.5 h-3.5 text-indigo-400 mr-1" />
                    Instant UPI Print
                  </span>
                </div>
              </div>
            )}

            {/* STEP 2: PRINT SETTINGS */}
            {activeStep === 'settings' && selectedFile && (
              <div className="space-y-4 my-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Step 2 of 3</span>
                    <h2 className="text-lg font-bold text-slate-100">Print Settings</h2>
                  </div>
                  <button
                    onClick={() => setActiveStep('upload')}
                    className="text-xs text-indigo-400 hover:underline flex items-center"
                  >
                    Change File
                  </button>
                </div>

                {/* File Thumbnail & Preview Card */}
                <div className="glass-card p-3 rounded-xl flex items-center space-x-3 border-indigo-500/20">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-950/80 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-400 flex items-center mt-0.5">
                      <span className="bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </span>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {/* Settings Grid */}
                <div className="glass-card p-4 rounded-xl space-y-4 border-slate-800">
                  {/* Copies Stepper */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-200">Number of Copies</label>
                      <p className="text-[10px] text-slate-400">Total sets to print</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/60 rounded-xl p-1">
                      <button
                        onClick={() => setSettings((s) => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-indigo-400">{settings.copies}</span>
                      <button
                        onClick={() => setSettings((s) => ({ ...s, copies: s.copies + 1 }))}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-800/60" />

                  {/* Color Mode Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, color_mode: 'bw' }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                          settings.color_mode === 'bw'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Black & White</span>
                        <span className="text-[10px] opacity-75">
                          (₹{shop?.price_per_page_bw || 2}/pg)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, color_mode: 'color' }))}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                          settings.color_mode === 'color'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Full Color</span>
                        <span className="text-[10px] opacity-75">
                          (₹{shop?.price_per_page_color || 10}/pg)
                        </span>
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-800/60" />

                  {/* Duplex Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-200">Double-Sided (Duplex)</label>
                      <p className="text-[10px] text-slate-400">Print on both sides of paper</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, duplex: !s.duplex }))}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        settings.duplex ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.duplex ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <hr className="border-slate-800/60" />

                  {/* Page Range Input */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-slate-200">Page Range</label>
                      <p className="text-[10px] text-slate-400">e.g. "all", "1-3", "5"</p>
                    </div>
                    <input
                      type="text"
                      value={settings.page_range}
                      onChange={(e) => setSettings((s) => ({ ...s, page_range: e.target.value }))}
                      className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700/60 rounded-lg text-xs font-mono text-center text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Price Breakdown Preview */}
                <div className="glass-card p-4 rounded-xl border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400">Calculated Total</span>
                    <p className="text-2xl font-black text-white">₹{currentPricing.total_price}</p>
                    <p className="text-[10px] text-slate-400">
                      {currentPricing.total_pages} total pages ({pageCount} pgs × {settings.copies} copies)
                    </p>
                  </div>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={creatingJob}
                    className="py-3 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {creatingJob ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & PAY */}
            {activeStep === 'pay' && createdJob && (
              <div className="space-y-4 my-auto">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Step 3 of 3</span>
                  <h2 className="text-xl font-bold text-slate-100">Review & UPI Checkout</h2>
                  <p className="text-xs text-slate-400">Pay securely to send your document to the printer queue</p>
                </div>

                {/* Receipt Card */}
                <div className="glass-card p-5 rounded-2xl space-y-3 border-indigo-500/30">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs text-slate-400">Document</span>
                    <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                      {createdJob.file_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Pages</span>
                    <span className="text-slate-200">{createdJob.page_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Copies</span>
                    <span className="text-slate-200">{createdJob.copies}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Print Mode</span>
                    <span className="text-slate-200 capitalize">
                      {createdJob.color_mode === 'bw' ? 'Black & White' : 'Full Color'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Duplex</span>
                    <span className="text-slate-200">{createdJob.duplex ? 'Yes (Double-sided)' : 'No'}</span>
                  </div>

                  <hr className="border-slate-800" />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-slate-200">Total Payable</span>
                    <span className="text-2xl font-black text-emerald-400">₹{createdJob.price}</span>
                  </div>
                </div>

                {/* UPI Payment Trigger Options */}
                <div className="space-y-2">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={paymentSimulating}
                    className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {paymentSimulating ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-5 h-5 fill-current" />
                        <span>Pay ₹{createdJob.price} via Instant UPI / Demo</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    Supports Google Pay, PhonePe, Paytm, BHIM & All UPI Apps
                  </p>
                </div>
              </div>
            )}

            {/* LIVE STATUS STEPPER */}
            {activeStep === 'status' && createdJob && (
              <div className="space-y-5 my-auto">
                <div className="glass-card p-6 rounded-2xl text-center border-indigo-500/40 relative overflow-hidden">
                  {/* Status Visual Badges */}
                  {createdJob.status === 'queued' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-indigo-900/60 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-pulse-glow">
                        <Clock className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-white">In Printer Queue</h3>
                      <p className="text-xs text-indigo-300 font-medium">
                        Payment Received • {queueAheadCount > 0 ? `${queueAheadCount} job(s) ahead of you` : 'You are next in line!'}
                      </p>
                    </div>
                  )}

                  {createdJob.status === 'printing' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-400 flex items-center justify-center mx-auto animate-spin">
                        <Printer className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-amber-400">Printing Now...</h3>
                      <p className="text-xs text-slate-300">Your pages are coming out of the shop printer.</p>
                    </div>
                  )}

                  {createdJob.status === 'done' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black text-emerald-400">Ready for Pickup!</h3>
                      <p className="text-xs text-slate-300">Please collect your printed document at the shop counter.</p>
                    </div>
                  )}

                  {createdJob.status === 'failed' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-400 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black text-rose-400">Print Failed</h3>
                      <p className="text-xs text-rose-300">
                        {createdJob.failure_reason || 'Paper jam or printer error. Please speak with the shopkeeper.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Job Summary Card */}
                <div className="glass-card p-4 rounded-xl space-y-2 text-xs border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>Order Reference ID</span>
                    <span className="font-mono text-slate-200">{createdJob.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>File</span>
                    <span className="font-semibold text-slate-200 truncate max-w-[180px]">
                      {createdJob.file_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Print Mode</span>
                    <span className="text-slate-200 capitalize">
                      {createdJob.color_mode} ({createdJob.copies} copies)
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => {
                    setActiveStep('upload');
                    setSelectedFile(null);
                    setCreatedJob(null);
                  }}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Print Another Document</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="mt-4 pt-3 border-t border-slate-800/60 text-center text-[10px] text-slate-500">
        Powered by PrintEzz • QR Instant Self-Service Printing
      </footer>
    </div>
  );
}
