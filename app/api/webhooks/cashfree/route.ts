import { NextRequest, NextResponse } from 'next/server';
import { getPrintJobById, savePrintJob } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, type } = body;

    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data) {
      const jobId = data.order?.order_id || data.customer_details?.customer_id;
      const paymentId = data.payment?.cf_payment_id;

      if (jobId) {
        const existingJob = await getPrintJobById(jobId);
        if (existingJob && existingJob.status === 'pending') {
          await savePrintJob({
            ...existingJob,
            status: 'queued',
            payment_id: String(paymentId),
            payment_status: 'paid',
          });
          console.log(`[Cashfree Webhook] Job ${jobId} updated to QUEUED.`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Cashfree Webhook] Error:', err);
    return NextResponse.json({ error: err.message || 'Webhook failed' }, { status: 500 });
  }
}
