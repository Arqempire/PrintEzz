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
import ThemeToggle from '@/components/ThemeToggle';

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
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-main)] p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--card-border)] shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary-green)] flex items-center justify-center text-white shadow-md">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold font-serif-title text-[var(--primary-green)]">{shop?.name || 'Shopkeeper Dashboard'}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    online
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${
                      online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {online ? 'Agent Terminal Online' : 'Agent Offline'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Shop ID: <code className="text-[var(--primary-green)] bg-[var(--badge-bg)] px-1.5 py-0.5 rounded font-mono">{shopId}</code> •
                Last heartbeat:{' '}
                {shop?.last_seen ? new Date(shop.last_seen).toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <button
              onClick={handleSendHeartbeat}
              disabled={agentSimulating}
              className="py-2.5 px-4 bg-[var(--secondary-btn)] hover:opacity-90 text-[var(--text-main)] rounded-full text-xs font-semibold flex items-center space-x-2 border border-[var(--card-border)] transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${agentSimulating ? 'animate-spin' : ''}`} />
              <span>Send Agent Heartbeat</span>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="py-2.5 px-5 bg-[var(--primary-green)] hover:opacity-90 text-white rounded-full text-xs font-bold flex items-center space-x-2 shadow-sm transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Shop QR Poster</span>
            </button>
          </div>
        </header>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)]">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Revenue</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black font-serif-title text-[var(--primary-green)]">₹{totalRevenue}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Calculated from paid jobs</p>
          </div>

          <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)]">
            <div className="flex items-center justify-between text-[var(--primary-green)] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Queue</span>
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black font-serif-title text-[var(--text-main)]">{pendingQueueCount}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Jobs waiting for print agent</p>
          </div>

          <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)]">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Black & White</span>
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black font-serif-title text-[var(--text-main)]">{bwJobsCount}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Rate: ₹{shop?.price_per_page_bw || 2}/page</p>
          </div>

          <div className="bg-[var(--card-bg)] p-5 rounded-2xl border border-[var(--card-border)]">
            <div className="flex items-center justify-between text-[var(--primary-green)] mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Full Color</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black font-serif-title text-[var(--text-main)]">{colorJobsCount}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Rate: ₹{shop?.price_per_page_color || 10}/page</p>
          </div>
        </div>

        {/* Live Job Queue Table */}
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--card-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif-title text-[var(--primary-green)]">Live Print Job Queue</h2>
              <p className="text-xs text-[var(--text-muted)]">Real-time status updates via Supabase Realtime</p>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {['all', 'queued', 'printing', 'done', 'failed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-[var(--primary-green)] text-white shadow-sm'
                      : 'bg-[var(--secondary-btn)] border border-[var(--card-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-main)]">
              <thead className="bg-[var(--bg-color)] text-[var(--text-muted)] uppercase font-mono text-[10px] border-b border-[var(--card-border)]">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Job ID</th>
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">File Name</th>
                  <th className="py-3.5 px-4">Settings</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Retention</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--card-border)]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[var(--text-muted)]">
                      No print jobs found matching filter '{statusFilter}'
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[var(--bg-color)]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                        {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--primary-green)] font-semibold">
                        #{job.id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[var(--text-main)]">
                        {job.customer_id || 'usr_anon'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[var(--text-main)] max-w-[180px] truncate">
                        {job.file_name}
                      </td>
                      <td className="py-3.5 px-4 text-[var(--text-main)]">
                        <span className="font-semibold text-[var(--text-main)]">
                          {job.page_count} pgs × {job.copies} set
                        </span>{' '}
                        •{' '}
                        <span className="capitalize text-[var(--primary-green)] font-semibold">
                          {job.color_mode}
                        </span>{' '}
                        {job.duplex ? '• Duplex' : ''}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-serif-title text-[var(--primary-green)] text-sm">
                        ₹{job.price}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            job.status === 'queued'
                              ? 'bg-[var(--badge-bg)] text-[var(--badge-text)]'
                              : job.status === 'printing'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse'
                              : job.status === 'done'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                          }`}
                        >
                          {job.status}
                        </span>
                        {job.failure_reason && (
                          <p className="text-[10px] text-rose-500 mt-1 max-w-[150px] truncate">
                            {job.failure_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleRetention(job.id, job.retention_extended)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center space-x-1 border transition-colors ${
                            job.retention_extended
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-[var(--secondary-btn)] border-[var(--card-border)] text-[var(--text-muted)]'
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
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-[11px] font-bold transition-all shadow-sm"
                          >
                            Start Print
                          </button>
                        )}

                        {job.status === 'printing' && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'done')}
                            className="px-3 py-1 bg-[var(--primary-green)] hover:opacity-90 text-white rounded-full text-[11px] font-bold transition-all shadow-sm"
                          >
                            Mark Done
                          </button>
                        )}

                        {(job.status === 'failed' || job.status === 'needs_attention') && (
                          <button
                            onClick={() => handleUpdateJobStatus(job.id, 'queued')}
                            className="px-3 py-1 bg-[var(--primary-green)] hover:opacity-90 text-white rounded-full text-[11px] font-bold inline-flex items-center space-x-1 transition-all shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-[var(--bg-color)]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] max-w-sm w-full p-6 rounded-3xl text-center border border-[var(--card-border)] relative shadow-2xl">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary-green)]">
                  Shop Front Counter Poster
                </span>
                <h3 className="text-xl font-bold font-serif-title text-[var(--primary-green)]">{shop?.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">Customers scan this QR code to print instantly from phone</p>
              </div>

              <div className="bg-white p-6 rounded-2xl inline-block shadow-lg mx-auto border border-slate-200">
                <QRCodeSVG value={shopUrl} size={200} level="H" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono text-[var(--primary-green)] break-all">{shopUrl}</p>
                <a
                  href={shopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[var(--primary-green)] hover:opacity-90 text-white font-bold text-xs rounded-full flex items-center justify-center space-x-2 transition-all shadow-md"
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
