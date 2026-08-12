import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPrintJobById, savePrintJob } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const razorpaySignature = req.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Optional HMAC signature verification if secret configured
    if (webhookSecret && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        console.error('[Razorpay Webhook] Invalid signature mismatch');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (event === 'payment.captured' || event === 'order.paid') {
      const jobId = paymentEntity?.notes?.job_id || payload.payload?.order?.entity?.notes?.job_id;
      const paymentId = paymentEntity?.id || `pay_${Date.now()}`;

      if (jobId) {
        const existingJob = await getPrintJobById(jobId);
        if (existingJob) {
          // Idempotency check: if job is already paid/queued/printing/done, skip duplicate updates
          if (existingJob.status !== 'pending') {
            console.log(`[Razorpay Webhook] Job ${jobId} already in status: ${existingJob.status}. Skipping webhook.`);
            return NextResponse.json({ success: true, message: 'Already processed' });
          }

          // Move job to paid -> queued
          await savePrintJob({
            ...existingJob,
            status: 'queued',
            payment_id: paymentId,
            payment_status: 'paid',
          });

          console.log(`[Razorpay Webhook] Job ${jobId} successfully updated to QUEUED.`);
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('[Razorpay Webhook] Error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
