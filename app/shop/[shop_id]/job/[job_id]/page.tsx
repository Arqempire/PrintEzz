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
      const res = await fetch(`/api/jobs/${jobId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.job) setJob(data.job);
      }
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
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Checking live print status...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between py-4">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-slate-800/60 flex items-center justify-between">
        <Link
          href={`/shop/${shopId}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shop</span>
        </Link>
        <span className="text-xs font-mono text-slate-400">Ref: #{jobId.substring(0, 8)}</span>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center space-y-4">
        {job ? (
          <div className="glass-card p-6 rounded-2xl text-center border-indigo-500/40 space-y-4">
            {job.status === 'queued' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-indigo-900/60 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-pulse-glow">
                  <Clock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-white">In Printer Queue</h2>
                <p className="text-xs text-indigo-300">Payment Verified • Document ready for shop PC agent</p>
              </div>
            )}

            {job.status === 'printing' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-400 flex items-center justify-center mx-auto animate-spin">
                  <Printer className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-amber-400">Printing Now</h2>
                <p className="text-xs text-slate-300">Your pages are coming out of the shop printer right now.</p>
              </div>
            )}

            {job.status === 'done' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-emerald-400">Ready for Pickup</h2>
                <p className="text-xs text-slate-300">Please pick up your print from the counter.</p>
              </div>
            )}

            {job.status === 'failed' && (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-500/60 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-rose-400">Print Failed</h2>
                <p className="text-xs text-rose-300">
                  {job.failure_reason || 'Hardware issue detected. Please consult shop staff.'}
                </p>
              </div>
            )}

            <hr className="border-slate-800" />

            <div className="space-y-2 text-left text-xs text-slate-400">
              <div className="flex justify-between">
                <span>File Name:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[180px]">{job.file_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Copies:</span>
                <span className="text-slate-200">{job.copies}</span>
              </div>
              <div className="flex justify-between">
                <span>Color Mode:</span>
                <span className="text-slate-200 capitalize">{job.color_mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Price Paid:</span>
                <span className="font-bold text-emerald-400">₹{job.price}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 rounded-2xl text-center border-slate-800">
            <p className="text-sm text-slate-300">Job not found.</p>
          </div>
        )}
      </main>

      <footer className="mt-4 pt-3 border-t border-slate-800/60 text-center text-[10px] text-slate-500">
        PrintEzz Realtime Order Tracking
      </footer>
    </div>
  );
}
