'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Printer,
  QrCode,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Eye,
  Shield,
  Download,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PrintJob, Shop, JobStatus } from '@/lib/types';
import { isShopOnline } from '@/lib/pricing';
import { supabaseClient } from '@/lib/supabase/client';
import { safeFetchJson } from '@/lib/api-client';

export default function ShopkeeperDashboardPage() {
  const params = useParams();
  const shopId = (params?.shop_id as string) || 'demo-shop';

  // Dashboard State
  const [shop, setShop] = useState<Shop | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showQRModal, setShowQRModal] = useState(false);
  const [agentSimulating, setAgentSimulating] = useState(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(true); // default true for shopkeeper ease of testing
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Fetch shop and jobs
  const loadDashboardData = async (isFirstLoad = false) => {
    try {
      if (isFirstLoad || !shop) {
        setLoading(true);
      }
      const heartbeatData = await safeFetchJson<{ shop?: Shop; queuedJobs?: PrintJob[] }>('/api/shop/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      });

      if (heartbeatData.shop) {
        setShop(heartbeatData.shop);
      }
      if (heartbeatData.queuedJobs) {
        setJobs(heartbeatData.queuedJobs);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    const interval = setInterval(() => loadDashboardData(false), 10000); // 10s silent auto refresh

    // Realtime channel for instant queue updates
    const channel = supabaseClient
      .channel(`admin_${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
      clearInterval(interval);
    };
  }, [shopId]);

  // Action: Update Job Status
  const handleUpdateJobStatus = async (jobId: string, newStatus: JobStatus, failureReason?: string) => {
    try {
      const data = await safeFetchJson<{ job?: PrintJob }>('/api/shop/agent-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          status: newStatus,
          failureReason,
        }),
      });

      if (data.job) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job! : j)));
      }
    } catch (err: any) {
      alert('Failed to update job: ' + err.message);
    }
  };

  // Action: Toggle File Retention (24h+)
  const handleToggleRetention = async (jobId: string, currentExtended: boolean) => {
    try {
      const data = await safeFetchJson<{ job?: PrintJob }>('/api/shop/agent-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          retentionExtended: !currentExtended,
        }),
      });

      if (data.job) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job! : j)));
      }
    } catch (err: any) {
      alert('Failed to update retention: ' + err.message);
    }
  };

  // Action: Simulate Agent Heartbeat
  const handleSendHeartbeat = async () => {
    try {
      setAgentSimulating(true);
      const data = await safeFetchJson<{ shop?: Shop }>('/api/shop/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      });
      if (data.shop) setShop(data.shop);
    } finally {
      setAgentSimulating(false);
    }
  };

  const online = isShopOnline(shop?.last_seen);
  const shopUrl = typeof window !== 'undefined' ? `${window.location.origin}/shop/${shopId}` : `/shop/${shopId}`;

  // Filtered jobs list
  const filteredJobs = jobs.filter((job) => {
    if (statusFilter === 'all') return true;
    return job.status === statusFilter;
  });

  // Calculate earnings metrics
  const totalRevenue = jobs.filter((j) => j.payment_status === 'paid' || j.status === 'done').reduce((acc, j) => acc + (j.price || 0), 0);
  const bwJobsCount = jobs.filter((j) => j.color_mode === 'bw').length;
  const colorJobsCount = jobs.filter((j) => j.color_mode === 'color').length;
  const pendingQueueCount = jobs.filter((j) => j.status === 'queued').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 md:p-8 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-card p-6 rounded-2xl border-slate-800">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-black text-slate-100">{shop?.name || 'Shopkeeper Dashboard'}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    online
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${
                      online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {online ? 'Agent Terminal Online' : 'Agent Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Shop ID: <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded">{shopId}</code> •
                Last heartbeat:{' '}
                {shop?.last_seen ? new Date(shop.last_seen).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSendHeartbeat}
              disabled={agentSimulating}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${agentSimulating ? 'animate-spin' : ''}`} />
              <span>Send Agent Heartbeat</span>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Shop QR Poster</span>
            </button>
          </div>
        </header>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Revenue</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-white">₹{totalRevenue}</p>
            <p className="text-[11px] text-slate-400 mt-1">Calculated from paid jobs</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border-indigo-500/20 bg-indigo-950/10">
            <div className="flex items-center justify-between text-indigo-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Queue</span>
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-white">{pendingQueueCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Jobs waiting for print agent</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Black & White</span>
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-white">{bwJobsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Rate: ₹{shop?.price_per_page_bw || 2}/page</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border-slate-800">
            <div className="flex items-center justify-between text-violet-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Full Color</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-white">{colorJobsCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">Rate: ₹{shop?.price_per_page_color || 10}/page</p>
          </div>
        </div>

        {/* Live Job Queue Table */}
        <div className="glass-card rounded-2xl border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Live Print Job Queue</h2>
              <p className="text-xs text-slate-400">Real-time status updates via Supabase Realtime</p>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {['all', 'queued', 'printing', 'done', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Job ID</th>
                  <th className="py-3.5 px-4">File Name</th>
                  <th className="py-3.5 px-4">Settings</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Retention</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No print jobs found matching filter '{statusFilter}'
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-300">
                        #{job.id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200 max-w-[180px] truncate">
                        {job.file_name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="font-semibold text-slate-200">
                          {job.page_count} pgs × {job.copies} set
                        </span>{' '}
                        •{' '}
                        <span className="capitalize text-indigo-300">
                          {job.color_mode}
                        </span>{' '}
                        {job.duplex ? '• Duplex' : ''}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ₹{job.price}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            job.status === 'queued'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : job.status === 'printing'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                              : job.status === 'done'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {job.status}
                        </span>
                        {job.failure_reason && (
                          <p className="text-[10px] text-rose-400 mt-1 max-w-[150px] truncate">
                            {job.failure_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleRetention(job.id, job.retention_extended)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center space-x-1 border transition-colors ${
                            job.retention_extended
                              ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{job.retention_extended ? 'Keep File (Ext)' : '24h Auto-Del'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {job.status === 'queued' && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'printing')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition-all"
                          >
                            Start Print
                          </button>
                        )}

                        {job.status === 'printing' && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'done')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition-all"
                          >
                            Mark Done
                          </button>
                        )}

                        {(job.status === 'failed' || job.status === 'needs_attention') && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'queued')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reprint</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Code Printable Poster Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-sm w-full p-6 rounded-3xl text-center border-indigo-500/40 relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Shop Front Counter Poster
                </span>
                <h3 className="text-xl font-black text-slate-100">{shop?.name}</h3>
                <p className="text-xs text-slate-400">Customers scan this QR code to print instantly from phone</p>
              </div>

              <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl mx-auto">
                <QRCodeSVG value={shopUrl} size={200} level="H" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono text-indigo-300 break-all">{shopUrl}</p>
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Test Customer View</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
