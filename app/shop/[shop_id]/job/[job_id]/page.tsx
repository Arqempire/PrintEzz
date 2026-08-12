'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ArrowLeft,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { PrintJob } from '@/lib/types';
import { supabaseClient } from '@/lib/supabase/client';
import { safeFetchJson } from '@/lib/api-client';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

export default function JobStatusPage() {
  const params = useParams();
  const shopId = (params?.shop_id as string) || 'demo-shop';
  const jobId = (params?.job_id as string) || '';

  const [job, setJob] = useState<PrintJob | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobStatus = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJson<{ job?: PrintJob }>(`/api/jobs/${jobId}/status`);
      if (data.job) setJob(data.job);
    } catch (err) {
      console.error('Error fetching job status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();

    // Supabase Realtime subscription
    const channel = supabaseClient
      .channel(`job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          setJob(payload.new as PrintJob);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [jobId]);

  if (loading && !job) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex-1 flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--primary-green)] mb-3" />
        <p className="text-sm font-medium">Checking live print status...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between px-4 pt-safe pb-safe shadow-2xl bg-[var(--bg-color)] text-[var(--text-main)] border-x border-[var(--card-border)] transition-colors duration-300">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <Link
          href={`/shop/${shopId}`}
          className="text-xs text-[var(--primary-green)] hover:underline font-medium flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shop</span>
        </Link>
        <div className="flex items-center space-x-3">
          <ThemeToggle />
          <span className="text-xs font-mono text-[var(--text-muted)]">Ref: #{jobId.substring(0, 8)}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center space-y-4">
        {job ? (
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl text-center border border-[var(--card-border)] space-y-4 shadow-sm">
            {job.status === 'queued' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] flex items-center justify-center mx-auto animate-pulse-glow">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black font-serif-title text-[var(--primary-green)]">In Printer Queue</h2>
                <p className="text-xs text-[var(--text-muted)]">Payment Verified • Document ready for shop PC agent</p>
              </div>
            )}

            {job.status === 'printing' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto animate-spin">
                  <Printer className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black font-serif-title text-amber-600 dark:text-amber-400">Printing Now</h2>
                <p className="text-xs text-[var(--text-muted)]">Your pages are coming out of the shop printer right now.</p>
              </div>
            )}

            {job.status === 'done' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black font-serif-title text-emerald-600 dark:text-emerald-400">Ready for Pickup</h2>
                <p className="text-xs text-[var(--text-muted)]">Please pick up your print from the counter.</p>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black font-serif-title text-rose-500">Print Failed</h2>
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {job.failure_reason || 'Hardware issue detected. Please consult shop staff.'}
                </p>
              </div>
            )}

            <hr className="border-[var(--card-border)]" />

            <div className="space-y-2 text-left text-xs text-[var(--text-muted)]">
              <div className="flex justify-between">
                <span>File Name:</span>
                <span className="font-semibold text-[var(--text-main)] truncate max-w-[180px]">{job.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Copies:</span>
                <span className="text-[var(--text-main)] font-semibold">{job.copies}</span>
              </div>
              <div className="flex justify-between">
                <span>Color Mode:</span>
                <span className="text-[var(--text-main)] font-semibold capitalize">{job.color_mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Price Paid:</span>
                <span className="font-bold text-[var(--primary-green)] font-serif-title text-sm">₹{job.price}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] p-6 rounded-2xl text-center border border-[var(--card-border)]">
            <p className="text-sm text-[var(--text-muted)]">Job not found.</p>
          </div>
        )}
      </main>

      <footer className="mt-4 pt-3 border-t border-[var(--card-border)] text-center text-[10px] text-[var(--text-muted)]">
        PrintEzz Realtime Order Tracking
      </footer>
    </div>
  );
}
