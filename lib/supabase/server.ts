import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrintJob, Shop } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  supabaseServiceKey
);

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceKey || 'placeholder-service-key',
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

// In-Memory Mock Store for zero-setup local dev/testing
const mockShops: Record<string, Shop> = {
  'demo-shop': {
    id: 'demo-shop',
    name: 'QuickPrint Express (MG Road)',
    price_per_page_bw: 2,
    price_per_page_color: 10,
    last_seen: new Date().toISOString(),
    is_accepting_jobs: true,
    created_at: new Date().toISOString(),
  },
  'campus-print': {
    id: 'campus-print',
    name: 'Campus Tech Hub Printer',
    price_per_page_bw: 1.5,
    price_per_page_color: 8,
    last_seen: new Date().toISOString(),
    is_accepting_jobs: true,
    created_at: new Date().toISOString(),
  },
};

const mockJobs: Map<string, PrintJob> = new Map();

export async function getShopById(shopId: string): Promise<Shop | null> {
  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from('shops').select('*').eq('id', shopId).single();
      if (!error && data) return data as Shop;
    } catch (err) {
      console.warn('[Supabase Server] Error fetching shop:', err);
    }
  }

  // Fallback to mock shop
  if (mockShops[shopId]) return mockShops[shopId];
  
  // Dynamic default mock shop for any shop_id
  return {
    id: shopId,
    name: `Print Shop (${shopId})`,
    price_per_page_bw: 2,
    price_per_page_color: 10,
    last_seen: new Date().toISOString(),
    is_accepting_jobs: true,
    created_at: new Date().toISOString(),
  };
}

export async function savePrintJob(jobData: Partial<PrintJob>): Promise<PrintJob> {
  const id = jobData.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fullJob: PrintJob = {
    id,
    shop_id: jobData.shop_id || 'demo-shop',
    file_url: jobData.file_url || null,
    file_name: jobData.file_name || 'document.pdf',
    page_count: jobData.page_count || 1,
    copies: jobData.copies || 1,
    color_mode: jobData.color_mode || 'bw',
    duplex: jobData.duplex || false,
    page_range: jobData.page_range || 'all',
    price: jobData.price || 2,
    status: jobData.status || 'pending',
    failure_reason: jobData.failure_reason || null,
    retry_count: jobData.retry_count || 0,
    retention_extended: jobData.retention_extended || false,
    delete_at: jobData.delete_at || null,
    payment_id: jobData.payment_id || null,
    payment_status: jobData.payment_status || 'unpaid',
    created_at: jobData.created_at || now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from('print_jobs').upsert(fullJob).select().single();
      if (!error && data) return data as PrintJob;
    } catch (err) {
      console.warn('[Supabase Server] Error saving job to Supabase:', err);
    }
  }

  // Fallback to mock store
  mockJobs.set(id, fullJob);
  return fullJob;
}

export async function getPrintJobById(jobId: string): Promise<PrintJob | null> {
  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from('print_jobs').select('*').eq('id', jobId).single();
      if (!error && data) return data as PrintJob;
    } catch (err) {
      console.warn('[Supabase Server] Error fetching job from Supabase:', err);
    }
  }

  return mockJobs.get(jobId) || null;
}

export async function getShopJobs(shopId: string): Promise<PrintJob[]> {
  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as PrintJob[];
    } catch (err) {
      console.warn('[Supabase Server] Error fetching shop jobs from Supabase:', err);
    }
  }

  return Array.from(mockJobs.values())
    .filter((j) => j.shop_id === shopId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateShopHeartbeat(shopId: string): Promise<Shop> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('shops')
        .update({ last_seen: now })
        .eq('id', shopId)
        .select()
        .single();
      if (!error && data) return data as Shop;
    } catch (err) {
      console.warn('[Supabase Server] Error updating heartbeat:', err);
    }
  }

  if (!mockShops[shopId]) {
    mockShops[shopId] = {
      id: shopId,
      name: `Print Shop (${shopId})`,
      price_per_page_bw: 2,
      price_per_page_color: 10,
      last_seen: now,
      is_accepting_jobs: true,
      created_at: now,
    };
  } else {
    mockShops[shopId].last_seen = now;
  }

  return mockShops[shopId];
}
