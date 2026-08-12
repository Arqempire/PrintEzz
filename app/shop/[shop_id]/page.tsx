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
  Eye,
  X,
} from 'lucide-react';
import { Shop, PrintSettings, ColorMode, PrintJob } from '@/lib/types';
import { calculatePrintPrice, isShopOnline } from '@/lib/pricing';
import { supabaseClient } from '@/lib/supabase/client';
import { safeFetchJson } from '@/lib/api-client';
import ThemeToggle from '@/components/ThemeToggle';

export default function CustomerShopPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = (params?.shop_id as string) || 'demo-shop';

  // Core state
  const [shop, setShop] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [activeStep, setActiveStep] = useState<'upload' | 'settings' | 'pay' | 'status'>('upload');
  
  // Customer & Session state
  const [customerId, setCustomerId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('printezz_customer_id');
      if (!id) {
        id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('printezz_customer_id', id);
      }
      setCustomerId(id);
    }
  }, []);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showFilePreviewModal, setShowFilePreviewModal] = useState(false);
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
  const fetchShopDetails = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad || !shop) {
        setLoadingShop(true);
      }
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
    fetchShopDetails(true);
    const interval = setInterval(() => fetchShopDetails(false), 15000); // silent background refresh every 15s
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
          customerId,
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

  if (loadingShop && !shop) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex-1 flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--primary-green)] mb-3" />
        <p className="text-sm font-medium">Connecting to print shop...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between px-4 pt-safe pb-safe shadow-2xl bg-[var(--bg-color)] text-[var(--text-main)] border-x border-[var(--card-border)] transition-colors duration-300">
      {/* Top Bar / Header */}
      <header className="mb-4 pb-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary-green)] flex items-center justify-center text-white shadow-md">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[var(--primary-green)] font-serif-title leading-tight">
              {shop?.name || 'Self-Service Print Shop'}
            </h1>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="inline-flex items-center text-xs">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className={online ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-500'}>
                  {online ? 'Online & Ready' : 'Shop Offline'}
                </span>
              </span>
              {online && queueAheadCount > 0 && (
                <span className="text-[11px] bg-[var(--badge-bg)] text-[var(--badge-text)] px-2 py-0.5 rounded-full font-medium">
                  {queueAheadCount} in queue
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <button
            onClick={() => fetchShopDetails(true)}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Refresh Shop Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 flex flex-col justify-center space-y-4">
        {/* Offline Warning Blocking Container */}
        {!online && (
          <div className="p-6 rounded-2xl text-center bg-rose-500/10 border border-rose-500/30 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold font-serif-title text-[var(--text-main)] mb-1">Shop PC Offline</h2>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              The shopkeeper's printing terminal is currently disconnected or updating. Please notify the counter staff to resume print service.
            </p>
            <button
              onClick={() => fetchShopDetails(true)}
              className="w-full py-3 bg-[var(--secondary-btn)] hover:opacity-90 text-[var(--text-main)] rounded-full font-medium text-sm flex items-center justify-center space-x-2 transition-all active:scale-95"
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
                  <span className="text-xs uppercase font-semibold text-[var(--primary-green)] tracking-wider">Step 1 of 3</span>
                  <h2 className="text-xl font-bold font-serif-title text-[var(--primary-green)]">Upload your Document</h2>
                  <p className="text-xs text-[var(--text-muted)]">PDF, DOCX, JPG or PNG (up to 20MB)</p>
                </div>

                {/* Upload Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[var(--card-bg)] p-6 rounded-2xl border-dashed border-2 border-[var(--card-border)] hover:border-[var(--primary-green)] text-center cursor-pointer relative overflow-hidden group transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-main)]">Tap to browse files</h3>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">or drag and drop document here</p>

                  {uploading && (
                    <div className="absolute inset-0 bg-[var(--bg-color)]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-3 z-20">
                      <div className="w-10 h-10 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center animate-spin">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="text-center space-y-1 max-w-[240px]">
                        <p className="text-xs font-bold text-[var(--text-main)] truncate">
                          {selectedFile?.name || 'Document'}
                        </p>
                        <p className="text-[11px] text-[var(--primary-green)] font-medium">
                          {uploadProgress < 35
                            ? 'Processing file & counting pages...'
                            : uploadProgress < 95
                            ? `Uploading to secure storage (${uploadProgress}%)`
                            : 'Upload complete!'}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full max-w-[240px] space-y-1">
                        <div className="w-full bg-[var(--secondary-btn)] h-2.5 rounded-full overflow-hidden p-0.5 border border-[var(--card-border)]">
                          <div
                            className="bg-[var(--primary-green)] h-full rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
                          <span>
                            {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : ''}
                          </span>
                          <span className="text-[var(--primary-green)] font-bold">{uploadProgress}%</span>
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
                    className="w-full py-3.5 px-4 bg-[var(--secondary-btn)] hover:opacity-90 rounded-full border border-[var(--card-border)] text-[var(--text-main)] font-medium text-sm flex items-center justify-center space-x-2 transition-all active:scale-98"
                  >
                    <Camera className="w-5 h-5 text-[var(--primary-green)]" />
                    <span>Take Photo of Physical Document</span>
                  </button>
                </div>

                <div className="flex items-center justify-center space-x-4 text-[11px] text-[var(--text-muted)] pt-2">
                  <span className="flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    Auto-deleted in 24h
                  </span>
                  <span className="flex items-center">
                    <Zap className="w-3.5 h-3.5 text-[var(--primary-green)] mr-1" />
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
                    <span className="text-xs uppercase font-semibold text-[var(--primary-green)] tracking-wider">Step 2 of 3</span>
                    <h2 className="text-lg font-bold font-serif-title text-[var(--primary-green)]">Print Settings</h2>
                  </div>
                  <button
                    onClick={() => setActiveStep('upload')}
                    className="text-xs text-[var(--primary-green)] hover:underline flex items-center font-medium"
                  >
                    Change File
                  </button>
                </div>

                {/* File Thumbnail & Interactive Preview Card */}
                <div
                  onClick={() => setShowFilePreviewModal(true)}
                  className="bg-[var(--card-bg)] p-3 rounded-2xl flex items-center justify-between border border-[var(--card-border)] hover:border-[var(--primary-green)] cursor-pointer group transition-all"
                  title="Click to view and inspect document pages"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded-lg border border-[var(--card-border)] group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)] truncate group-hover:text-[var(--primary-green)] transition-colors">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] flex items-center mt-0.5">
                        <span className="bg-[var(--badge-bg)] text-[var(--badge-text)] px-1.5 py-0.5 rounded mr-2 font-mono text-[10px]">
                          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                        </span>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFilePreviewModal(true);
                    }}
                    className="ml-2 px-3 py-1.5 bg-[var(--secondary-btn)] hover:opacity-90 text-[var(--text-main)] rounded-full text-xs font-semibold flex items-center space-x-1.5 border border-[var(--card-border)] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--primary-green)]" />
                    <span>View File</span>
                  </button>
                </div>

                {/* Settings Grid */}
                <div className="bg-[var(--card-bg)] p-4 rounded-2xl space-y-4 border border-[var(--card-border)]">
                  {/* Copies Stepper */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-main)]">Number of Copies</label>
                      <p className="text-[10px] text-[var(--text-muted)]">Total sets to print</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-[var(--bg-color)] border border-[var(--card-border)] rounded-full p-1">
                      <button
                        onClick={() => setSettings((s) => ({ ...s, copies: Math.max(1, s.copies - 1) }))}
                        className="w-8 h-8 rounded-full bg-[var(--secondary-btn)] text-[var(--text-main)] flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm text-[var(--primary-green)]">{settings.copies}</span>
                      <button
                        onClick={() => setSettings((s) => ({ ...s, copies: s.copies + 1 }))}
                        className="w-8 h-8 rounded-full bg-[var(--secondary-btn)] text-[var(--text-main)] flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <hr className="border-[var(--card-border)]" />

                  {/* Color Mode Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-main)]">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, color_mode: 'bw' }))}
                        className={`py-2.5 px-3 rounded-full text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                          settings.color_mode === 'bw'
                            ? 'bg-[var(--primary-green)] text-white shadow-md'
                            : 'bg-[var(--secondary-btn)] border border-[var(--card-border)] text-[var(--text-muted)]'
                        }`}
                      >
                        <span>Black & White</span>
                        <span className="text-[10px] opacity-80">
                          (₹{shop?.price_per_page_bw || 2}/pg)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettings((s) => ({ ...s, color_mode: 'color' }))}
                        className={`py-2.5 px-3 rounded-full text-xs font-medium flex items-center justify-center space-x-2 transition-all ${
                          settings.color_mode === 'color'
                            ? 'bg-[var(--primary-green)] text-white shadow-md'
                            : 'bg-[var(--secondary-btn)] border border-[var(--card-border)] text-[var(--text-muted)]'
                        }`}
                      >
                        <span>Full Color</span>
                        <span className="text-[10px] opacity-80">
                          (₹{shop?.price_per_page_color || 10}/pg)
                        </span>
                      </button>
                    </div>
                  </div>

                  <hr className="border-[var(--card-border)]" />

                  {/* Duplex Switch */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-main)]">Double-Sided (Duplex)</label>
                      <p className="text-[10px] text-[var(--text-muted)]">Print on both sides of paper</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, duplex: !s.duplex }))}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        settings.duplex ? 'bg-[var(--primary-green)]' : 'bg-[var(--secondary-btn)]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.duplex ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <hr className="border-[var(--card-border)]" />

                  {/* Page Range Input */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-main)]">Page Range</label>
                      <p className="text-[10px] text-[var(--text-muted)]">e.g. "all", "1-3", "5"</p>
                    </div>
                    <input
                      type="text"
                      value={settings.page_range}
                      onChange={(e) => setSettings((s) => ({ ...s, page_range: e.target.value }))}
                      className="w-24 px-2.5 py-1.5 bg-[var(--bg-color)] border border-[var(--card-border)] rounded-xl text-xs font-mono text-center text-[var(--text-main)] focus:outline-none focus:border-[var(--primary-green)]"
                    />
                  </div>
                </div>

                {/* Price Breakdown Preview */}
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[var(--primary-green)]">Calculated Total</span>
                    <p className="text-2xl font-black font-serif-title text-[var(--primary-green)]">₹{currentPricing.total_price}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {currentPricing.total_pages} total pages ({pageCount} pgs × {settings.copies} copies)
                    </p>
                  </div>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={creatingJob}
                    className="py-3 px-6 bg-[var(--primary-green)] hover:opacity-90 text-white font-bold text-sm rounded-full flex items-center space-x-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
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
                  <span className="text-xs uppercase font-semibold text-[var(--primary-green)] tracking-wider">Step 3 of 3</span>
                  <h2 className="text-xl font-bold font-serif-title text-[var(--primary-green)]">Review & UPI Checkout</h2>
                  <p className="text-xs text-[var(--text-muted)]">Pay securely to send your document to the printer queue</p>
                </div>

                {/* Receipt Card */}
                <div className="bg-[var(--card-bg)] p-5 rounded-2xl space-y-3 border border-[var(--card-border)]">
                  <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                    <span className="text-xs text-[var(--text-muted)]">Document</span>
                    <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[200px]">
                      {createdJob.file_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Pages</span>
                    <span className="text-[var(--text-main)] font-semibold">{createdJob.page_count}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Copies</span>
                    <span className="text-[var(--text-main)] font-semibold">{createdJob.copies}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Print Mode</span>
                    <span className="text-[var(--text-main)] font-semibold capitalize">
                      {createdJob.color_mode === 'bw' ? 'Black & White' : 'Full Color'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">Duplex</span>
                    <span className="text-[var(--text-main)] font-semibold">{createdJob.duplex ? 'Yes (Double-sided)' : 'No'}</span>
                  </div>

                  <hr className="border-[var(--card-border)]" />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-[var(--text-main)] font-serif-title">Total Payable</span>
                    <span className="text-2xl font-black font-serif-title text-[var(--primary-green)]">₹{createdJob.price}</span>
                  </div>
                </div>

                {/* UPI Payment Trigger Options */}
                <div className="space-y-2">
                  <button
                    onClick={handleSimulatePayment}
                    disabled={paymentSimulating}
                    className="w-full py-4 px-4 bg-[var(--primary-green)] hover:opacity-90 text-white font-bold text-base rounded-full flex items-center justify-center space-x-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
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

                  <p className="text-[11px] text-center text-[var(--text-muted)]">
                    Supports Google Pay, PhonePe, Paytm, BHIM & All UPI Apps
                  </p>
                </div>
              </div>
            )}

            {/* LIVE STATUS STEPPER */}
            {activeStep === 'status' && createdJob && (
              <div className="space-y-5 my-auto">
                <div className="bg-[var(--card-bg)] p-6 rounded-2xl text-center border border-[var(--card-border)] relative overflow-hidden">
                  {/* Status Visual Badges */}
                  {createdJob.status === 'queued' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center mx-auto animate-pulse-glow">
                        <Clock className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black font-serif-title text-[var(--primary-green)]">In Printer Queue</h3>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        Payment Received • {queueAheadCount > 0 ? `${queueAheadCount} job(s) ahead of you` : 'You are next in line!'}
                      </p>
                    </div>
                  )}

                  {createdJob.status === 'printing' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-spin">
                        <Printer className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black font-serif-title text-amber-600 dark:text-amber-400">Printing Now...</h3>
                      <p className="text-xs text-[var(--text-muted)]">Your pages are coming out of the shop printer.</p>
                    </div>
                  )}

                  {createdJob.status === 'done' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black font-serif-title text-emerald-600 dark:text-emerald-400">Ready for Pickup!</h3>
                      <p className="text-xs text-[var(--text-muted)]">Please collect your printed document at the shop counter.</p>
                    </div>
                  )}

                  {createdJob.status === 'failed' && (
                    <div className="space-y-3">
                      <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-black font-serif-title text-rose-500">Print Failed</h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400">
                        {createdJob.failure_reason || 'Paper jam or printer error. Please speak with the shopkeeper.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Job Summary Card */}
                <div className="bg-[var(--card-bg)] p-4 rounded-2xl space-y-2 text-xs border border-[var(--card-border)]">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Unique Customer ID</span>
                    <span className="font-mono text-[var(--primary-green)] font-semibold">{createdJob.customer_id || customerId || 'usr_anon'}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Order Job ID</span>
                    <span className="font-mono text-[var(--text-main)] font-bold">#{createdJob.id.substring(0, 8)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>File</span>
                    <span className="font-semibold text-[var(--text-main)] truncate max-w-[180px]">
                      {createdJob.file_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Print Mode</span>
                    <span className="text-[var(--text-main)] capitalize">
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
                  className="w-full py-3.5 bg-[var(--secondary-btn)] hover:opacity-90 text-[var(--text-main)] font-semibold text-sm rounded-full flex items-center justify-center space-x-2 border border-[var(--card-border)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Print Another Document</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Document Preview Modal */}
      {showFilePreviewModal && selectedFile && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-color)]/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--card-border)]">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-[var(--text-main)] truncate max-w-[200px] sm:max-w-md">
                  {selectedFile.name}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] flex items-center">
                  <span className="text-[var(--primary-green)] font-semibold mr-2 font-mono">
                    {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                  </span>
                  • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFilePreviewModal(false)}
              className="p-2 rounded-xl bg-[var(--secondary-btn)] text-[var(--text-main)] font-semibold text-xs flex items-center justify-center transition-colors border border-[var(--card-border)]"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewer Area */}
          <div className="flex-1 my-3 bg-[var(--card-bg)] rounded-2xl overflow-hidden border border-[var(--card-border)] flex items-center justify-center relative p-2 shadow-xl">
            {selectedFile.type.startsWith('image/') || filePreviewUrl ? (
              <img
                src={filePreviewUrl || URL.createObjectURL(selectedFile)}
                alt="Document Preview"
                className="max-h-full max-w-full object-contain rounded-lg shadow-xl"
              />
            ) : (
              <iframe
                src={`${URL.createObjectURL(selectedFile)}#toolbar=0`}
                title="Document Preview Frame"
                className="w-full h-full rounded-xl border-0 bg-white/5"
              />
            )}
          </div>

          <button
            onClick={() => setShowFilePreviewModal(false)}
            className="w-full py-3.5 bg-[var(--primary-green)] hover:opacity-90 text-white font-bold text-sm rounded-full shadow-md transition-all active:scale-95"
          >
            Close Preview & Return to Order
          </button>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="mt-4 pt-3 border-t border-[var(--card-border)] text-center text-[10px] text-[var(--text-muted)]">
        Powered by PrintEzz • QR Instant Self-Service Printing
      </footer>
    </div>
  );
}
