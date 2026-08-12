export type ColorMode = 'bw' | 'color';

export type JobStatus =
  | 'pending'
  | 'paid'
  | 'queued'
  | 'printing'
  | 'done'
  | 'failed'
  | 'needs_attention'
  | 'abandoned';

export interface Shop {
  id: string;
  name: string;
  owner_id?: string;
  price_per_page_bw: number;
  price_per_page_color: number;
  last_seen: string | null; // ISO timestamp for agent heartbeat
  is_accepting_jobs?: boolean;
  created_at: string;
}

export interface PrintSettings {
  copies: number;
  color_mode: ColorMode;
  duplex: boolean;
  page_size: 'A4' | 'A3' | 'Letter';
  page_range: string; // e.g. "all", "1-5", "1,3,5"
}

export interface PrintJob {
  id: string;
  shop_id: string;
  customer_id?: string | null;
  file_url: string | null;
  file_name: string;
  page_count: number;
  copies: number;
  color_mode: ColorMode;
  duplex: boolean;
  page_range: string;
  price: number;
  status: JobStatus;
  failure_reason: string | null;
  retry_count: number;
  retention_extended: boolean;
  delete_at: string | null;
  payment_id?: string | null;
  payment_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceBreakdown {
  page_count: number;
  copies: number;
  color_mode: ColorMode;
  rate_per_page: number;
  subtotal: number;
  total_pages: number;
  total_price: number;
}
